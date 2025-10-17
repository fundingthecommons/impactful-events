import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { env } from "~/env";

export const configRouter = createTRPCRouter({
  getPublicConfig: publicProcedure.query(() => {
    return {
      adminEmail: env.ADMIN_EMAIL,
    };
  }),
});