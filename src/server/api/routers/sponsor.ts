import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

export const sponsorRouter = createTRPCRouter({
  getSponsors: publicProcedure.query(async ({ ctx }) => {
    const sponsors = await ctx.db.sponsor.findMany({
      include: {
        contacts: true,
        events: true,
      },
    });
    return sponsors;
  }),

  getSponsor: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sponsor = await ctx.db.sponsor.findUnique({
        where: { id: input.id },
        include: {
          contacts: true,
          events: true,
        },
      });
      return sponsor;
    }),
}); 