import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { env } from "~/env";

export const configRouter = createTRPCRouter({
  getPublicConfig: publicProcedure.query(() => {
    return {
      adminEmail: env.ADMIN_EMAIL,
      oauthProviders: {
        google: !!(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
        discord: !!(env.AUTH_DISCORD_ID && env.AUTH_DISCORD_SECRET),
        github: !!(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET),
      },
      waapEnabled: process.env.NEXT_PUBLIC_WAAP_ENABLED !== "false",
    };
  }),

  /**
   * Get platform-wide community statistics
   * Returns counts of members, projects, and updates across all events
   */
  getCommunityStats: publicProcedure.query(async ({ ctx }) => {
    const [memberCount, projectCount, updateCount, eventCount] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.userProject.count(),
      ctx.db.projectUpdate.count(),
      ctx.db.event.count(),
    ]);

    return {
      members: memberCount,
      projects: projectCount,
      updates: updateCount,
      events: eventCount,
    };
  }),
});