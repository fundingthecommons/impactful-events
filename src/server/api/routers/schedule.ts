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
          sessionType: { select: { id: true, name: true, color: true } },
          sessionSpeakers: {
            include: { user: { select: userSelectFields } },
            orderBy: { order: "asc" },
          },
        },
        orderBy: [{ startTime: "asc" }, { order: "asc" }],
      });

      return { event, sessions };
    }),

  // Public: Get filter options (venues + session types) for an event
  getEventScheduleFilters: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);

      const [venues, sessionTypes] = await Promise.all([
        ctx.db.scheduleVenue.findMany({
          where: { eventId: event.id },
          orderBy: { order: "asc" },
        }),
        ctx.db.scheduleSessionType.findMany({
          where: { eventId: event.id },
          orderBy: { order: "asc" },
        }),
      ]);

      return { venues, sessionTypes };
    }),

  // ──────────────────────────────────────────
  // Session mutations (admin or floor owner)
  // ──────────────────────────────────────────

  // Create a session (admin or floor owner of the target venue)
  createSession: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
        speakers: z.array(z.string()).default([]),
        linkedSpeakerIds: z.array(z.string()).optional(),
        venueId: z.string().optional(),
        sessionTypeId: z.string().optional(),
        order: z.number().default(0),
        isPublished: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

      const { linkedSpeakerIds, ...sessionData } = input;
      const session = await ctx.db.scheduleSession.create({ data: sessionData });

      if (linkedSpeakerIds && linkedSpeakerIds.length > 0) {
        await ctx.db.sessionSpeaker.createMany({
          data: linkedSpeakerIds.map((userId, index) => ({
            sessionId: session.id,
            userId,
            order: index,
          })),
        });
      }

      return session;
    }),

  // Update a session (admin or floor owner of the session's venue)
  updateSession: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        startTime: z.coerce.date().optional(),
        endTime: z.coerce.date().optional(),
        speakers: z.array(z.string()).optional(),
        linkedSpeakerIds: z.array(z.string()).optional(),
        venueId: z.string().nullable().optional(),
        sessionTypeId: z.string().nullable().optional(),
        order: z.number().optional(),
        isPublished: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, linkedSpeakerIds, ...data } = input;

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
      }

      const session = await ctx.db.scheduleSession.update({ where: { id }, data });

      // Sync linked speakers if explicitly provided
      if (linkedSpeakerIds !== undefined) {
        await ctx.db.sessionSpeaker.deleteMany({ where: { sessionId: id } });
        if (linkedSpeakerIds.length > 0) {
          await ctx.db.sessionSpeaker.createMany({
            data: linkedSpeakerIds.map((userId, index) => ({
              sessionId: id,
              userId,
              order: index,
            })),
          });
        }
      }

      return session;
    }),

  // Delete a session (admin or floor owner of the session's venue)
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
      return ctx.db.scheduleVenue.create({ data: input });
    }),

  // Admin or floor owner: Update venue metadata
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
      return ctx.db.scheduleSessionType.create({ data: input });
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
  // Floor owner queries
  // ──────────────────────────────────────────

  // Check if current user is a floor owner for an event
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
          sessionType: { select: { id: true, name: true, color: true } },
          sessionSpeakers: {
            include: { user: { select: userSelectFields } },
            orderBy: { order: "asc" },
          },
        },
        orderBy: [{ startTime: "asc" }, { order: "asc" }],
      });

      return { event, sessions };
    }),

  // ──────────────────────────────────────────
  // Venue owner management (admin only)
  // ──────────────────────────────────────────

  // Admin: Assign a floor owner to a venue
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

      // Send floor owner assignment notification email
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

  // Admin: Remove a floor owner from a venue
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
