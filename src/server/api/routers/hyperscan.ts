import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { getHyperscanService } from "~/server/services/hyperscan";

export const hyperscanRouter = createTRPCRouter({
  /**
   * Get network-wide statistics from the Hypersphere
   */
  getNetworkStats: publicProcedure.query(async () => {
    const service = getHyperscanService();
    return service.getNetworkStats();
  }),

  /**
   * Get the feed of recent hypercerts and biodiversity records
   */
  getFeed: publicProcedure
    .input(
      z.object({
        type: z
          .enum(["activity", "occurrence", "contributor"])
          .optional(),
        limit: z.number().min(1).max(100).optional().default(20),
      })
    )
    .query(async ({ input }) => {
      const service = getHyperscanService();
      return service.getFeed({ type: input.type, limit: input.limit });
    }),

  /**
   * Get a user's Hypersphere activity by resolving their DID from our DB
   */
  getProfileActivity: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const atAccount = await ctx.db.atProtoAccount.findUnique({
        where: { userId: input.userId },
        select: { did: true, handle: true },
      });

      if (!atAccount) {
        return { hasAtProto: false as const, activity: null };
      }

      const service = getHyperscanService();
      try {
        const profile = await service.getProfile(atAccount.did);
        return {
          hasAtProto: true as const,
          handle: atAccount.handle,
          did: atAccount.did,
          activity: profile,
        };
      } catch {
        // Graceful degradation if Hyperscan is unreachable
        return {
          hasAtProto: true as const,
          handle: atAccount.handle,
          did: atAccount.did,
          activity: null,
        };
      }
    }),
});
