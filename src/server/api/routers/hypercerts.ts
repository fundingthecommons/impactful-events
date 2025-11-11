import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createHypercertsService } from "~/server/services/hypercerts";
import { TRPCError } from "@trpc/server";

export const hypercertsRouter = createTRPCRouter({
  /**
   * Create a hypercert for a project
   */
  createForProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the project with all details
      const project = await ctx.db.userProject.findUnique({
        where: { id: input.projectId },
        include: {
          profile: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Check if user owns the project
      if (project.profile.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the project owner can create a hypercert",
        });
      }

      const service = createHypercertsService(ctx.db);

      // Create the hypercert
      const result = await service.createHypercert(ctx.session.user.id, {
        title: project.title,
        shortDescription: project.description ?? `Impact work on ${project.title}`,
        description: project.description
          ? `This hypercert represents the impact work done on ${project.title}.\n\n${project.description}`
          : `This hypercert represents the impact work done on ${project.title}.`,
        workScope: project.technologies.length > 0
          ? project.technologies.join(", ")
          : "Software development and impact work",
        workTimeFrameFrom: project.createdAt.toISOString(),
        workTimeFrameTo: new Date().toISOString(),
        image: project.bannerUrl ?? project.imageUrl ?? undefined,
      });

      return {
        success: true,
        uri: result.uri,
        cid: result.cid,
        projectTitle: project.title,
      };
    }),

  /**
   * List all hypercerts for the current user
   */
  listMyHypercerts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const service = createHypercertsService(ctx.db);
      const hypercerts = await service.listHypercerts(ctx.session.user.id, input.limit);

      return hypercerts;
    }),

  /**
   * Get a specific hypercert
   */
  getHypercert: protectedProcedure
    .input(
      z.object({
        rkey: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const service = createHypercertsService(ctx.db);
      const hypercert = await service.getHypercert(ctx.session.user.id, input.rkey);

      return hypercert;
    }),
});
