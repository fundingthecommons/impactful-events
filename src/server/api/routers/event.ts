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
              sponsor: true,
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
            sponsor: true,
          },
        },
      },
    });
    return events;
  }),
}); 