import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const projectRouter = createTRPCRouter({
  getUserProjects: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check if the requesting user has permission to view these projects
      const requestingUser = ctx.session.user;
      
      // Only allow admins/staff or the user themselves to view projects
      if (
        requestingUser.role !== "admin" && 
        requestingUser.role !== "staff" && 
        requestingUser.id !== input.userId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view these projects",
        });
      }

      const projects = await ctx.db.project.findMany({
        where: {
          createdById: input.userId,
        },
        select: {
          id: true,
          title: true,
          description: true,
          repoUrl: true,
          demoUrl: true,
          videoUrl: true,
          submissionDate: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          track: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          submissionDate: "desc",
        },
      });

      return projects;
    }),

  createProject: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Project title is required"),
        description: z.string().optional(),
        repoUrl: z.union([z.string().url(), z.literal("")]).optional(),
        demoUrl: z.union([z.string().url(), z.literal("")]).optional(),
        videoUrl: z.union([z.string().url(), z.literal("")]).optional(),
        teamId: z.string(),
        trackId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the team exists and the user has access to it
      const team = await ctx.db.team.findUnique({
        where: { id: input.teamId },
        include: {
          members: {
            where: { userId },
          },
        },
      });

      if (!team) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }

      if (team.members.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this team",
        });
      }

      // Check if project already exists for this team
      const existingProject = await ctx.db.project.findUnique({
        where: { teamId: input.teamId },
      });

      if (existingProject) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A project already exists for this team",
        });
      }

      const project = await ctx.db.project.create({
        data: {
          title: input.title,
          description: input.description,
          repoUrl: input.repoUrl ?? null,
          demoUrl: input.demoUrl ?? null,
          videoUrl: input.videoUrl ?? null,
          teamId: input.teamId,
          trackId: input.trackId ?? null,
          createdById: userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          track: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return project;
    }),

  updateProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().min(1, "Project title is required").optional(),
        description: z.string().optional(),
        repoUrl: z.union([z.string().url(), z.literal("")]).optional(),
        demoUrl: z.union([z.string().url(), z.literal("")]).optional(),
        videoUrl: z.union([z.string().url(), z.literal("")]).optional(),
        trackId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the project exists and the user has access to it
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        include: {
          team: {
            include: {
              members: {
                where: { userId },
              },
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

      if (project.team.members.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this project",
        });
      }

      const updatedProject = await ctx.db.project.update({
        where: { id: input.projectId },
        data: {
          ...(input.title && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.repoUrl !== undefined && { repoUrl: input.repoUrl ?? null }),
          ...(input.demoUrl !== undefined && { demoUrl: input.demoUrl ?? null }),
          ...(input.videoUrl !== undefined && { videoUrl: input.videoUrl ?? null }),
          ...(input.trackId !== undefined && { trackId: input.trackId ?? null }),
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          track: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return updatedProject;
    }),

  // Public: Get projects from event participants
  getEventProjects: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get accepted participants for this event
      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          status: "ACCEPTED",
          applicationType: "RESIDENT",
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: {
                select: {
                  projects: {
                    select: {
                      id: true,
                      title: true,
                      description: true,
                      githubUrl: true,
                      liveUrl: true,
                      imageUrl: true,
                      technologies: true,
                      featured: true,
                      createdAt: true,
                    },
                    orderBy: [
                      { featured: "desc" },
                      { createdAt: "desc" }
                    ]
                  }
                }
              }
            }
          }
        }
      });

      // Flatten projects with user information
      const projects = acceptedApplications
        .filter(app => app.user?.profile?.projects?.length)
        .flatMap(app => 
          app.user!.profile!.projects.map(project => ({
            ...project,
            author: {
              id: app.user!.id,
              name: app.user!.name,
              image: app.user!.image,
            }
          }))
        )
        .sort((a, b) => {
          // Sort by featured first, then by creation date
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

      return projects;
    }),
});