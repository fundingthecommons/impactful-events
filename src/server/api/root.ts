import { postRouter } from "~/server/api/routers/post";
import { contactRouter } from "~/server/api/routers/contact";
import { sponsorRouter } from "~/server/api/routers/sponsor";
import { eventRouter } from "~/server/api/routers/event";
import { coinGeckoRouter } from "~/server/api/routers/coinGecko";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  contact: contactRouter,
  sponsor: sponsorRouter,
  event: eventRouter,
  coinGecko: coinGeckoRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
