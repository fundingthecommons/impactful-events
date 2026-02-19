import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@prisma/client";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  isAdminOrStaff,
  assertCanManageVenue,
  assertCanManageSession,
  isEventFloorOwner,
  getUserOwnedVenueIds,
} from "~/server/api/utils/scheduleAuth";
import { getEmailService } from "~/server/email/emailService";
import { captureEmailError } from "~/utils/errorCapture";

const PARTICIPANT_ROLES = [
  "Speaker",
  "Facilitator",
  "Moderator",
  "Presenter",
  "Panelist",
  "Host",
] as const;

const eventSelect = {
  id: true,
  name: true,
  slug: true,
  startDate: true,
  endDate: true,
  location: true,
  type: true,
} as const;

// Helper to resolve eventId (could be slug or CUID)
async function resolveEventId(db: PrismaClient, eventIdOrSlug: string) {
  let event = await db.event.findUnique({
    where: { id: eventIdOrSlug },
    select: eventSelect,
  });

  event ??= await db.event.findUnique({
    where: { slug: eventIdOrSlug },
    select: eventSelect,
  });

  if (!event) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
  }

  return event;
}

const userSelectFields = {
  id: true,
  firstName: true,
  surname: true,
  name: true,
  email: true,
  image: true,
} as const;

/**
 * Validate that all linked speaker user IDs are floor applicants for the given venue.
 * Only enforced for non-admin users.
 */
async function validateSpeakersAreFloorApplicants(
  db: PrismaClient,
  userRole: string | undefined | null,
  venueId: string,
  speakerUserIds: string[],
): Promise<void> {
  if (isAdminOrStaff(userRole)) return;
  if (speakerUserIds.length === 0) return;

  const validApplicantCount = await db.applicationVenue.count({
    where: {
      venueId,
      application: {
        userId: { in: speakerUserIds },
      },
    },
  });

  if (validApplicantCount < speakerUserIds.length) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "One or more selected participants have not applied for this floor. Floor leads can only add applicants for their floor.",
    });
  }
}

export const scheduleRouter = createTRPCRouter({
  // ──────────────────────────────────────────
  // Public endpoints
  // ──────────────────────────────────────────

  // Public: Get all published sessions for an event
  getEventSchedule: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);

      const sessions = await ctx.db.scheduleSession.findMany({
        where: { eventId: event.id, isPublished: true },
        include: {
          venue: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          sessionType: { select: { id: true, name: true, color: true } },
          track: { select: { id: true, name: true, color: true } },
          sessionSpeakers: {
            include: {
              user: {
                select: {
                  ...userSelectFields,
                  profile: {
                    select: {
                      bio: true,
                      jobTitle: true,
                      company: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: [{ startTime: "asc" }, { order: "asc" }],
      });

      return { event, sessions };
    }),

  // Public: Get a single session by ID
  getSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.scheduleSession.findUnique({
        where: { id: input.sessionId },
        include: {
          event: { select: { id: true, name: true, slug: true } },
          venue: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          sessionType: { select: { id: true, name: true, color: true } },
          track: { select: { id: true, name: true, color: true } },
          sessionSpeakers: {
            include: {
              user: {
                select: {
                  ...userSelectFields,
                  profile: {
                    select: {
                      bio: true,
                      jobTitle: true,
                      company: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      return session;
    }),

  // Public: Get filter options (venues + session types + tracks) for an event
  getEventScheduleFilters: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);

      const [venues, sessionTypes, tracks] = await Promise.all([
        ctx.db.scheduleVenue.findMany({
          where: { eventId: event.id },
          orderBy: { order: "asc" },
          include: {
            rooms: {
              orderBy: { order: "asc" },
              select: { id: true, name: true },
            },
            owners: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    surname: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
        }),
        ctx.db.scheduleSessionType.findMany({
          where: { eventId: event.id },
          orderBy: { order: "asc" },
        }),
        ctx.db.scheduleTrack.findMany({
          where: { eventId: event.id },
          orderBy: { order: "asc" },
        }),
      ]);

      // Derive unique floor leads with their venue IDs
      const floorManagerMap = new Map<
        string,
        {
          id: string;
          firstName: string | null;
          surname: string | null;
          name: string | null;
          image: string | null;
          venueIds: string[];
        }
      >();

      for (const venue of venues) {
        for (const owner of venue.owners) {
          const existing = floorManagerMap.get(owner.user.id);
          if (existing) {
            existing.venueIds.push(venue.id);
          } else {
            floorManagerMap.set(owner.user.id, {
              ...owner.user,
              venueIds: [venue.id],
            });
          }
        }
      }

      const floorManagers = Array.from(floorManagerMap.values());

      return { venues, sessionTypes, tracks, floorManagers };
    }),

  // ──────────────────────────────────────────
  // Session mutations (admin or floor lead)
  // ──────────────────────────────────────────

  // Create a session (admin or floor lead of the target venue)
  createSession: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
        speakers: z.array(z.string()).default([]),
        linkedSpeakers: z
          .array(
            z.object({
              userId: z.string(),
              role: z.enum(PARTICIPANT_ROLES).default("Speaker"),
            }),
          )
          .optional(),
        venueId: z.string().optional(),
        roomId: z.string().optional(),
        sessionTypeId: z.string().optional(),
        trackId: z.string().optional(),
        order: z.number().default(0),
        isPublished: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Resolve slug to real event ID
      const event = await resolveEventId(ctx.db, input.eventId);

      if (input.venueId) {
        await assertCanManageVenue(
          ctx.db,
          ctx.session.user.id,
          ctx.session.user.role,
          input.venueId,
        );
      } else if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can create sessions without a venue",
        });
      }

      // Validate room belongs to the session's venue
      if (input.roomId) {
        if (!input.venueId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot assign a room without a venue" });
        }
        const room = await ctx.db.scheduleRoom.findUnique({
          where: { id: input.roomId },
          select: { venueId: true },
        });
        if (!room || room.venueId !== input.venueId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Room does not belong to the selected floor" });
        }
      }

      const { linkedSpeakers, ...sessionData } = input;

      // Validate linked speakers are floor applicants (for non-admin users)
      if (linkedSpeakers && linkedSpeakers.length > 0 && input.venueId) {
        await validateSpeakersAreFloorApplicants(
          ctx.db,
          ctx.session.user.role,
          input.venueId,
          linkedSpeakers.map((s) => s.userId),
        );
      }

      const session = await ctx.db.scheduleSession.create({
        data: { ...sessionData, eventId: event.id },
      });

      if (linkedSpeakers && linkedSpeakers.length > 0) {
        await ctx.db.sessionSpeaker.createMany({
          data: linkedSpeakers.map((speaker, index) => ({
            sessionId: session.id,
            userId: speaker.userId,
            role: speaker.role,
            order: index,
          })),
        });
      }

      return session;
    }),

  // Bulk create sessions from CSV import (admin or floor lead of the target venue)
  bulkCreateSessions: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        venueId: z.string(),
        sessions: z.array(
          z.object({
            title: z.string().min(1),
            description: z.string().optional(),
            startTime: z.coerce.date(),
            endTime: z.coerce.date(),
            speakers: z.array(z.string()).default([]),
            linkedSpeakers: z
              .array(
                z.object({
                  userId: z.string(),
                  role: z.enum(PARTICIPANT_ROLES).default("Speaker"),
                }),
              )
              .optional(),
            sessionTypeId: z.string().optional(),
            trackId: z.string().optional(),
            order: z.number().default(0),
            isPublished: z.boolean().default(true),
          }),
        ),
        newSessionTypes: z
          .array(z.object({ name: z.string().min(1), color: z.string() }))
          .optional(),
        newTracks: z
          .array(z.object({ name: z.string().min(1), color: z.string() }))
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.venueId,
      );

      // Collect all unique linked speaker user IDs for validation
      const allSpeakerUserIds = [
        ...new Set(
          input.sessions.flatMap((s) =>
            s.linkedSpeakers?.map((ls) => ls.userId) ?? [],
          ),
        ),
      ];
      if (allSpeakerUserIds.length > 0) {
        await validateSpeakersAreFloorApplicants(
          ctx.db,
          ctx.session.user.role,
          input.venueId,
          allSpeakerUserIds,
        );
      }

      const result = await ctx.db.$transaction(async (tx) => {
        const newTypeIds: Record<string, string> = {};
        const newTrackIds: Record<string, string> = {};

        // Create new session types (skip if already exists)
        if (input.newSessionTypes && input.newSessionTypes.length > 0) {
          for (const st of input.newSessionTypes) {
            const existing = await tx.scheduleSessionType.findUnique({
              where: { eventId_name: { eventId: event.id, name: st.name } },
            });
            if (existing) {
              newTypeIds[st.name] = existing.id;
            } else {
              const created = await tx.scheduleSessionType.create({
                data: { eventId: event.id, name: st.name, color: st.color },
              });
              newTypeIds[st.name] = created.id;
            }
          }
        }

        // Create new tracks (skip if already exists)
        if (input.newTracks && input.newTracks.length > 0) {
          for (const tr of input.newTracks) {
            const existing = await tx.scheduleTrack.findUnique({
              where: { eventId_name: { eventId: event.id, name: tr.name } },
            });
            if (existing) {
              newTrackIds[tr.name] = existing.id;
            } else {
              const created = await tx.scheduleTrack.create({
                data: { eventId: event.id, name: tr.name, color: tr.color },
              });
              newTrackIds[tr.name] = created.id;
            }
          }
        }

        // Create sessions
        let createdCount = 0;
        for (const sessionInput of input.sessions) {
          const { linkedSpeakers, ...sessionData } = sessionInput;
          const session = await tx.scheduleSession.create({
            data: {
              ...sessionData,
              eventId: event.id,
              venueId: input.venueId,
            },
          });

          if (linkedSpeakers && linkedSpeakers.length > 0) {
            await tx.sessionSpeaker.createMany({
              data: linkedSpeakers.map((speaker, index) => ({
                sessionId: session.id,
                userId: speaker.userId,
                role: speaker.role,
                order: index,
              })),
            });
          }
          createdCount++;
        }

        return { created: createdCount, newTypeIds, newTrackIds };
      });

      return result;
    }),

  // Fuzzy match speaker names to platform users for CSV import
  fuzzyMatchSpeakers: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        names: z.array(z.string()).min(1).max(200),
      }),
    )
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      const results: Record<
        string,
        Array<{
          userId: string;
          firstName: string | null;
          surname: string | null;
          name: string | null;
          email: string | null;
          image: string | null;
          confidence: "exact" | "partial";
        }>
      > = {};

      for (const rawName of input.names) {
        // Strip parenthetical org annotation: "Tom Kalil (Renaissance Philanthropy)" → "Tom Kalil"
        const cleanName = rawName.replace(/\s*\([^)]*\)\s*/g, "").trim();
        if (!cleanName) {
          results[rawName] = [];
          continue;
        }

        const parts = cleanName.split(/\s+/);
        const firstName = parts[0] ?? "";
        const surname = parts.length > 1 ? parts.slice(1).join(" ") : "";

        const orConditions = [];
        if (firstName) {
          orConditions.push(
            { firstName: { contains: firstName, mode: "insensitive" as const } },
          );
        }
        if (surname) {
          orConditions.push(
            { surname: { contains: surname, mode: "insensitive" as const } },
          );
        }
        // Also try full name match on the "name" field
        orConditions.push(
          { name: { contains: cleanName, mode: "insensitive" as const } },
        );

        const users = await ctx.db.user.findMany({
          where: {
            AND: [
              {
                applications: {
                  some: {
                    eventId: event.id,
                    userId: { not: null },
                  },
                },
              },
              { OR: orConditions },
            ],
          },
          select: userSelectFields,
          take: 3,
        });

        results[rawName] = users.map((u) => {
          // Determine confidence: exact if first+last both match
          const uFirst = (u.firstName ?? "").toLowerCase();
          const uSurname = (u.surname ?? "").toLowerCase();
          const isExact =
            uFirst === firstName.toLowerCase() &&
            uSurname === surname.toLowerCase();
          return {
            userId: u.id,
            firstName: u.firstName,
            surname: u.surname,
            name: u.name,
            email: u.email,
            image: u.image,
            confidence: isExact ? ("exact" as const) : ("partial" as const),
          };
        });
      }

      return results;
    }),

  // Update a session (admin or floor lead of the session's venue)
  updateSession: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        startTime: z.coerce.date().optional(),
        endTime: z.coerce.date().optional(),
        speakers: z.array(z.string()).optional(),
        linkedSpeakers: z
          .array(
            z.object({
              userId: z.string(),
              role: z.enum(PARTICIPANT_ROLES).default("Speaker"),
            }),
          )
          .optional(),
        venueId: z.string().nullable().optional(),
        roomId: z.string().nullable().optional(),
        sessionTypeId: z.string().nullable().optional(),
        trackId: z.string().nullable().optional(),
        order: z.number().optional(),
        isPublished: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, linkedSpeakers, ...data } = input;

      // Check permission on the existing session
      await assertCanManageSession(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        id,
      );

      // If changing venue, also check permission on the target venue
      if (data.venueId !== undefined && data.venueId !== null) {
        await assertCanManageVenue(
          ctx.db,
          ctx.session.user.id,
          ctx.session.user.role,
          data.venueId,
        );
        // Clear room when changing to a different venue (room belongs to old venue)
        const currentSession = await ctx.db.scheduleSession.findUnique({
          where: { id },
          select: { venueId: true },
        });
        if (currentSession?.venueId !== data.venueId) {
          data.roomId = null;
        }
      }

      // Validate room belongs to the effective venue
      if (data.roomId !== undefined && data.roomId !== null) {
        const effectiveVenue = data.venueId ?? (await ctx.db.scheduleSession.findUnique({
          where: { id },
          select: { venueId: true },
        }))?.venueId;
        if (!effectiveVenue) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot assign a room without a venue" });
        }
        const room = await ctx.db.scheduleRoom.findUnique({
          where: { id: data.roomId },
          select: { venueId: true },
        });
        if (!room || room.venueId !== effectiveVenue) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Room does not belong to the selected floor" });
        }
      }

      // Validate linked speakers are floor applicants (for non-admin users)
      if (linkedSpeakers !== undefined && linkedSpeakers.length > 0) {
        let effectiveVenueId = data.venueId;
        if (effectiveVenueId === undefined) {
          const currentSession = await ctx.db.scheduleSession.findUnique({
            where: { id },
            select: { venueId: true },
          });
          effectiveVenueId = currentSession?.venueId ?? null;
        }
        if (effectiveVenueId) {
          await validateSpeakersAreFloorApplicants(
            ctx.db,
            ctx.session.user.role,
            effectiveVenueId,
            linkedSpeakers.map((s) => s.userId),
          );
        }
      }

      const session = await ctx.db.scheduleSession.update({ where: { id }, data });

      // Sync linked speakers if explicitly provided
      if (linkedSpeakers !== undefined) {
        await ctx.db.sessionSpeaker.deleteMany({ where: { sessionId: id } });
        if (linkedSpeakers.length > 0) {
          await ctx.db.sessionSpeaker.createMany({
            data: linkedSpeakers.map((speaker, index) => ({
              sessionId: id,
              userId: speaker.userId,
              role: speaker.role,
              order: index,
            })),
          });
        }
      }

      return session;
    }),

  // Delete a session (admin or floor lead of the session's venue)
  deleteSession: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertCanManageSession(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.id,
      );
      return ctx.db.scheduleSession.delete({ where: { id: input.id } });
    }),

  // ──────────────────────────────────────────
  // Venue mutations (admin only for create/delete, owner for update)
  // ──────────────────────────────────────────

  // Admin only: Create a venue
  createVenue: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        capacity: z.number().optional(),
        order: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required to create venues",
        });
      }
      // Resolve slug to real event ID
      const event = await resolveEventId(ctx.db, input.eventId);
      return ctx.db.scheduleVenue.create({ data: { ...input, eventId: event.id } });
    }),

  // Admin or floor lead: Update venue metadata
  updateVenue: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        capacity: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        id,
      );
      return ctx.db.scheduleVenue.update({ where: { id }, data });
    }),

  // Admin only: Delete a venue
  deleteVenue: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required to delete venues",
        });
      }
      return ctx.db.scheduleVenue.delete({ where: { id: input.id } });
    }),

  // ──────────────────────────────────────────
  // Room mutations (floor lead or admin)
  // ──────────────────────────────────────────

  // Create a room within a venue (max 3 per venue)
  createRoom: protectedProcedure
    .input(
      z.object({
        venueId: z.string(),
        name: z.string().min(1),
        capacity: z.number().optional(),
        order: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.venueId,
      );

      const roomCount = await ctx.db.scheduleRoom.count({
        where: { venueId: input.venueId },
      });
      if (roomCount >= 3) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Maximum of 3 rooms per floor",
        });
      }

      return ctx.db.scheduleRoom.create({ data: input });
    }),

  // Update room metadata (floor lead or admin)
  updateRoom: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        capacity: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.scheduleRoom.findUnique({
        where: { id: input.id },
        select: { venueId: true },
      });
      if (!room) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      }
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        room.venueId,
      );
      const { id, ...data } = input;
      return ctx.db.scheduleRoom.update({ where: { id }, data });
    }),

  // Delete a room (floor lead or admin). Sessions revert to roomId=null.
  deleteRoom: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.scheduleRoom.findUnique({
        where: { id: input.id },
        select: { venueId: true },
      });
      if (!room) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      }
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        room.venueId,
      );
      return ctx.db.scheduleRoom.delete({ where: { id: input.id } });
    }),

  // ──────────────────────────────────────────
  // Session type mutations (admin only)
  // ──────────────────────────────────────────

  // Admin only: Create a session type
  createSessionType: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        name: z.string().min(1),
        color: z.string().default("#4299e1"),
        order: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required to create session types",
        });
      }
      // Resolve slug to real event ID
      const event = await resolveEventId(ctx.db, input.eventId);
      return ctx.db.scheduleSessionType.create({ data: { ...input, eventId: event.id } });
    }),

  // Admin only: Delete a session type
  deleteSessionType: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required to delete session types",
        });
      }
      return ctx.db.scheduleSessionType.delete({ where: { id: input.id } });
    }),

  // ──────────────────────────────────────────
  // Track mutations (admin only)
  // ──────────────────────────────────────────

  // Admin only: Create a track
  createTrack: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        name: z.string().min(1),
        color: z.string().default("#8b5cf6"),
        order: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required to create tracks",
        });
      }
      // Resolve slug to real event ID
      const event = await resolveEventId(ctx.db, input.eventId);
      return ctx.db.scheduleTrack.create({ data: { ...input, eventId: event.id } });
    }),

  // Admin only: Delete a track
  deleteTrack: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required to delete tracks",
        });
      }
      return ctx.db.scheduleTrack.delete({ where: { id: input.id } });
    }),

  // ──────────────────────────────────────────
  // Floor lead queries
  // ──────────────────────────────────────────

  // Check if current user is a floor lead for an event
  isFloorOwner: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      return isEventFloorOwner(ctx.db, ctx.session.user.id, event.id);
    }),

  // Get venues the current user manages (all for admins)
  getMyFloors: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      const admin = isAdminOrStaff(ctx.session.user.role);

      const whereClause = admin
        ? { eventId: event.id }
        : {
            id: {
              in: await getUserOwnedVenueIds(
                ctx.db,
                ctx.session.user.id,
                event.id,
              ),
            },
          };

      const venues = await ctx.db.scheduleVenue.findMany({
        where: whereClause,
        include: {
          rooms: {
            orderBy: { order: "asc" },
            select: { id: true, name: true, capacity: true, order: true },
          },
          owners: {
            include: { user: { select: userSelectFields } },
          },
          _count: { select: { sessions: true } },
        },
        orderBy: { order: "asc" },
      });

      return { event, venues, isAdmin: admin };
    }),

  // Get sessions for a specific venue (authorized)
  getFloorSessions: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        venueId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.venueId,
      );

      const sessions = await ctx.db.scheduleSession.findMany({
        where: { eventId: event.id, venueId: input.venueId },
        include: {
          venue: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          sessionType: { select: { id: true, name: true, color: true } },
          track: { select: { id: true, name: true, color: true } },
          sessionSpeakers: {
            include: { user: { select: userSelectFields } },
            orderBy: { order: "asc" },
          },
        },
        orderBy: [{ startTime: "asc" }, { order: "asc" }],
      });

      return { event, sessions };
    }),

  // Search users who have applied for a specific venue/floor
  searchFloorApplicants: protectedProcedure
    .input(
      z.object({
        venueId: z.string(),
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.venueId,
      );

      const users = await ctx.db.user.findMany({
        where: {
          AND: [
            {
              applications: {
                some: {
                  venues: {
                    some: { venueId: input.venueId },
                  },
                  userId: { not: null },
                },
              },
            },
            {
              OR: [
                { firstName: { contains: input.query, mode: "insensitive" } },
                { surname: { contains: input.query, mode: "insensitive" } },
                { email: { contains: input.query, mode: "insensitive" } },
              ],
            },
          ],
        },
        select: userSelectFields,
        take: input.limit,
        orderBy: { firstName: "asc" },
      });

      return users;
    }),

  // Get applications linked to a specific venue/floor (for floor leads to create sessions from)
  getFloorApplications: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        venueId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.venueId,
      );

      const applications = await ctx.db.application.findMany({
        where: {
          eventId: event.id,
          venues: { some: { venueId: input.venueId } },
          status: { in: ["SUBMITTED", "ACCEPTED"] },
          userId: { not: null },
        },
        select: {
          id: true,
          status: true,
          applicationType: true,
          createdAt: true,
          speakerPreferredDates: true,
          speakerPreferredTimes: true,
          user: {
            select: {
              ...userSelectFields,
              profile: {
                select: {
                  speakerTalkTitle: true,
                  speakerTalkAbstract: true,
                  speakerTalkFormat: true,
                  speakerTalkDuration: true,
                  speakerTalkTopic: true,
                  speakerEntityName: true,
                  bio: true,
                  jobTitle: true,
                  company: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return applications;
    }),

  // ──────────────────────────────────────────
  // Venue owner management (admin only)
  // ──────────────────────────────────────────

  // Admin: Assign a floor lead to a venue
  assignVenueOwner: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        venueId: z.string(),
        eventId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      const [event, user, venue] = await Promise.all([
        resolveEventId(ctx.db, input.eventId),
        ctx.db.user.findUnique({ where: { id: input.userId } }),
        ctx.db.scheduleVenue.findUnique({ where: { id: input.venueId } }),
      ]);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      if (!venue) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
      }

      const venueOwner = await ctx.db.venueOwner.create({
        data: {
          userId: input.userId,
          venueId: input.venueId,
          eventId: event.id,
          assignedBy: ctx.session.user.id,
        },
        include: {
          user: { select: userSelectFields },
          venue: { select: { id: true, name: true } },
        },
      });

      // Send floor lead assignment notification email
      if (user.email) {
        try {
          const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
          const eventPath = event.slug ?? event.id;
          const manageFloorUrl = `${baseUrl}/events/${eventPath}/manage-schedule`;

          const fullName = [user.firstName, user.surname].filter(Boolean).join(" ");
          const floorOwnerName = fullName.length > 0 ? fullName : (user.name ?? "there");
          const assignedByName = ctx.session.user.name ?? ctx.session.user.email ?? "An administrator";

          const emailService = getEmailService(ctx.db);
          await emailService.sendEmail({
            to: user.email,
            templateName: "floorOwnerAssigned",
            templateData: {
              floorOwnerName,
              eventName: event.name,
              venueName: venue.name,
              assignedByName,
              manageFloorUrl,
            },
            eventId: event.id,
            userId: user.id,
          });
        } catch (error) {
          captureEmailError(error, {
            userId: user.id,
            emailType: "floor_owner_assigned",
            recipient: user.email,
            templateName: "floorOwnerAssigned",
          });
        }
      }

      return venueOwner;
    }),

  // Admin: Remove a floor lead from a venue
  removeVenueOwner: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        venueId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      const deleted = await ctx.db.venueOwner.deleteMany({
        where: { userId: input.userId, venueId: input.venueId },
      });

      if (deleted.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Venue ownership not found",
        });
      }

      return { success: true };
    }),

  // Get sessions where the current user is a linked speaker
  getMySessions: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      const sessions = await ctx.db.scheduleSession.findMany({
        where: {
          eventId: event.id,
          sessionSpeakers: { some: { userId: ctx.session.user.id } },
        },
        include: {
          venue: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          sessionType: { select: { id: true, name: true, color: true } },
          track: { select: { id: true, name: true, color: true } },
          sessionSpeakers: {
            include: { user: { select: userSelectFields } },
            orderBy: { order: "asc" },
          },
        },
        orderBy: [{ startTime: "asc" }, { order: "asc" }],
      });
      return sessions;
    }),

  // Admin: Get all venue owners for an event
  getVenueOwners: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      const event = await resolveEventId(ctx.db, input.eventId);

      return ctx.db.venueOwner.findMany({
        where: { eventId: event.id },
        include: {
          user: { select: userSelectFields },
          venue: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),
});
