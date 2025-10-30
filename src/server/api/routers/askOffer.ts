import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

// Input schemas
const CreateAskOfferSchema = z.object({
  eventId: z.string(),
  type: z.enum(["ASK", "OFFER"]),
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(10, "Description must be at least 10 characters"),
  tags: z.array(z.string()).default([]),
});

const UpdateAskOfferSchema = z.object({
  id: z.string(),
  title: z.string().min(3).max(100).optional(),
  description: z.string().min(10).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const askOfferRouter = createTRPCRouter({
  // Get all asks and offers for an event
  getEventAsksOffers: publicProcedure
    .input(z.object({
      eventId: z.string(),
      type: z.enum(["ASK", "OFFER", "ALL"]).default("ALL"),
      onlyActive: z.boolean().default(true),
    }))
    .query(async ({ ctx, input }) => {
      const { eventId, type, onlyActive } = input;

      const where: { eventId: string; type?: "ASK" | "OFFER"; isActive?: boolean } = {
        eventId,
      };

      if (type !== "ALL") {
        where.type = type;
      }

      if (onlyActive) {
        where.isActive = true;
      }

      const asksOffers = await ctx.db.askOffer.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              email: true,
              profile: {
                select: {
                  jobTitle: true,
                  company: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return asksOffers;
    }),

  // Get user's asks and offers for an event
  getUserAsksOffers: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const asksOffers = await ctx.db.askOffer.findMany({
        where: {
          eventId: input.eventId,
          userId: ctx.session.user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return asksOffers;
    }),

  // Create a new ask or offer
  create: protectedProcedure
    .input(CreateAskOfferSchema)
    .mutation(async ({ ctx, input }) => {
      const { eventId, type, title, description, tags } = input;

      // Verify user has access to this event (is an accepted participant)
      const application = await ctx.db.application.findFirst({
        where: {
          eventId,
          userId: ctx.session.user.id,
          status: "ACCEPTED",
        },
      });

      if (!application) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be an accepted participant to create asks/offers",
        });
      }

      const askOffer = await ctx.db.askOffer.create({
        data: {
          userId: ctx.session.user.id,
          eventId,
          type,
          title,
          description,
          tags,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      return askOffer;
    }),

  // Update an ask or offer
  update: protectedProcedure
    .input(UpdateAskOfferSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Verify ownership
      const askOffer = await ctx.db.askOffer.findUnique({
        where: { id },
      });

      if (!askOffer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ask/Offer not found",
        });
      }

      if (askOffer.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own asks/offers",
        });
      }

      const updated = await ctx.db.askOffer.update({
        where: { id },
        data: updateData,
      });

      return updated;
    }),

  // Delete an ask or offer
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const askOffer = await ctx.db.askOffer.findUnique({
        where: { id: input.id },
      });

      if (!askOffer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ask/Offer not found",
        });
      }

      if (askOffer.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own asks/offers",
        });
      }

      await ctx.db.askOffer.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Mark ask/offer as fulfilled (inactive)
  markFulfilled: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const askOffer = await ctx.db.askOffer.findUnique({
        where: { id: input.id },
      });

      if (!askOffer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ask/Offer not found",
        });
      }

      if (askOffer.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only mark your own asks/offers as fulfilled",
        });
      }

      const updated = await ctx.db.askOffer.update({
        where: { id: input.id },
        data: { isActive: false },
      });

      return updated;
    }),
});
