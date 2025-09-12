import { postRouter } from "~/server/api/routers/post";
import { contactRouter } from "~/server/api/routers/contact";
import { sponsorRouter } from "~/server/api/routers/sponsor";
import { eventRouter } from "~/server/api/routers/event";
import { coinGeckoRouter } from "~/server/api/routers/coinGecko";
import { roleRouter } from "~/server/api/routers/role";
import { applicationRouter } from "~/server/api/routers/application";
import { emailRouter } from "~/server/api/routers/email";
import { invitationRouter } from "~/server/api/routers/invitation";
import { mentorshipRouter } from "~/server/api/routers/mentorship";
import { userRouter } from "~/server/api/routers/user";
import { projectIdeaRouter } from "~/server/api/routers/projectIdea";
import { evaluationRouter } from "~/server/api/routers/evaluation";
import { profileRouter } from "~/server/api/routers/profile";
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
  role: roleRouter,
  application: applicationRouter,
  email: emailRouter,
  invitation: invitationRouter,
  mentorship: mentorshipRouter,
  user: userRouter,
  projectIdea: projectIdeaRouter,
  evaluation: evaluationRouter,
  profile: profileRouter,
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
