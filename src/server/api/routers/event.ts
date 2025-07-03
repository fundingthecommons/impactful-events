import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

export const eventRouter = createTRPCRouter({
  getEvent: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { id: input.id },
        include: {
          sponsors: {
            include: {
              sponsor: {
                include: {
                  contacts: true,
                },
              },
            },
          },
        },
      });
      return event;
    }),

  getEvents: publicProcedure.query(async ({ ctx }) => {
    const events = await ctx.db.event.findMany({
      include: {
        sponsors: {
          include: {
            sponsor: {
              include: {
                contacts: true,
              },
            },
          },
        },
      },
    });
    return events;
  }),

  addSponsorToEvent: publicProcedure
    .input(z.object({ 
      eventId: z.string(),
      sponsorId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if the relationship already exists
      const existing = await ctx.db.eventSponsor.findUnique({
        where: {
          eventId_sponsorId: {
            eventId: input.eventId,
            sponsorId: input.sponsorId,
          },
        },
      });

      if (existing) {
        throw new Error("Sponsor is already added to this event");
      }

      const eventSponsor = await ctx.db.eventSponsor.create({
        data: {
          eventId: input.eventId,
          sponsorId: input.sponsorId,
        },
        include: {
          sponsor: true,
        },
      });

      return eventSponsor;
    }),

  updateSponsorQualified: publicProcedure
    .input(z.object({ 
      eventId: z.string(),
      sponsorId: z.string(),
      qualified: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const eventSponsor = await ctx.db.eventSponsor.update({
        where: {
          eventId_sponsorId: {
            eventId: input.eventId,
            sponsorId: input.sponsorId,
          },
        },
        data: {
          qualified: input.qualified,
        },
        include: {
          sponsor: {
            include: {
              contacts: true,
            },
          },
        },
      });

      return eventSponsor;
    }),
}); 