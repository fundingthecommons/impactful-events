import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@prisma/client";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

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

export const scheduleRouter = createTRPCRouter({
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

  // Admin: Create a session
  createSession: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        startTime: z.date(),
        endTime: z.date(),
        speakers: z.array(z.string()).default([]),
        venueId: z.string().optional(),
        sessionTypeId: z.string().optional(),
        order: z.number().default(0),
        isPublished: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.scheduleSession.create({ data: input });
    }),

  // Admin: Update a session
  updateSession: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        startTime: z.date().optional(),
        endTime: z.date().optional(),
        speakers: z.array(z.string()).optional(),
        venueId: z.string().nullable().optional(),
        sessionTypeId: z.string().nullable().optional(),
        order: z.number().optional(),
        isPublished: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.scheduleSession.update({ where: { id }, data });
    }),

  // Admin: Delete a session
  deleteSession: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.scheduleSession.delete({ where: { id: input.id } });
    }),

  // Admin: Create a venue
  createVenue: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        capacity: z.number().optional(),
        order: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.scheduleVenue.create({ data: input });
    }),

  // Admin: Delete a venue
  deleteVenue: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.scheduleVenue.delete({ where: { id: input.id } });
    }),

  // Admin: Create a session type
  createSessionType: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        name: z.string().min(1),
        color: z.string().default("#4299e1"),
        order: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.scheduleSessionType.create({ data: input });
    }),

  // Admin: Delete a session type
  deleteSessionType: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.scheduleSessionType.delete({ where: { id: input.id } });
    }),
});
