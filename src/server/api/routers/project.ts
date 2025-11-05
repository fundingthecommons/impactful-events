import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const projectRouter = createTRPCRouter({
  getMyProjects: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      // Get user's accepted applications to find their eventId
      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          userId,
          status: "ACCEPTED",
        },
        select: {
          eventId: true,
        },
        take: 1, // Assume user is only in one active event for now
      });

      // Default to funding-commons-residency-2025 if no accepted application
      const eventId = acceptedApplications[0]?.eventId ?? "funding-commons-residency-2025";

      // Get user's profile
      const profile = await ctx.db.userProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!profile) {
        return [];
      }

      // Get user's own projects
      const ownProjects = await ctx.db.userProject.findMany({
        where: {
          profileId: profile.id,
        },
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Get projects where user is a collaborator
      const collaboratorProjects = await ctx.db.userProject.findMany({
        where: {
          collaborators: {
            some: {
              userId,
            },
          },
        },
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Merge and deduplicate, add eventId to each
      const allProjects = [...ownProjects, ...collaboratorProjects];
      const uniqueProjects = Array.from(
        new Map(allProjects.map(p => [p.id, p])).values()
      ).map(p => ({
        ...p,
        eventId,
      }));

      return uniqueProjects;
    }),

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
              firstName: true,
              surname: true,
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
              firstName: true,
              surname: true,
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
              firstName: true,
              surname: true,
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

  // Public: Get detailed project information
  getProjectDetails: publicProcedure
    .input(z.object({ 
      projectId: z.string(),
      eventId: z.string() 
    }))
    .query(async ({ ctx, input }) => {
      // Get project from UserProject model (not the hackathon Project model)
      const project = await ctx.db.userProject.findUnique({
        where: { id: input.projectId },
        include: {
          profile: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  applications: {
                    where: {
                      eventId: input.eventId,
                      status: "ACCEPTED",
                    },
                    take: 1,
                  }
                }
              }
            }
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  profile: {
                    select: {
                      jobTitle: true,
                      company: true,
                      location: true,
                      bio: true,
                    }
                  }
                }
              }
            },
            orderBy: {
              addedAt: "asc"
            }
          },
          likes: {
            select: {
              userId: true,
            }
          }
        }
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Verify the project owner is an accepted participant of this event
      if (!project.profile.user.applications.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found for this event",
        });
      }

      return {
        id: project.id,
        title: project.title,
        description: project.description,
        githubUrl: project.githubUrl,
        liveUrl: project.liveUrl,
        imageUrl: project.imageUrl,
        bannerUrl: project.bannerUrl,
        technologies: project.technologies,
        featured: project.featured,
        createdAt: project.createdAt,
        author: {
          id: project.profile.user.id,
          name: project.profile.user.name,
          image: project.profile.user.image,
          profile: {
            jobTitle: project.profile.jobTitle,
            company: project.profile.company,
            location: project.profile.location,
            bio: project.profile.bio,
            githubUrl: project.profile.githubUrl,
            linkedinUrl: project.profile.linkedinUrl,
            twitterUrl: project.profile.twitterUrl,
            website: project.profile.website,
          }
        },
        collaborators: project.collaborators.map(collab => ({
          id: collab.id,
          userId: collab.user.id,
          name: collab.user.name,
          image: collab.user.image,
          role: collab.role,
          canEdit: collab.canEdit,
          addedAt: collab.addedAt,
          profile: collab.user.profile ? {
            jobTitle: collab.user.profile.jobTitle,
            company: collab.user.profile.company,
            location: collab.user.profile.location,
            bio: collab.user.profile.bio,
          } : null
        })),
        likes: project.likes
      };
    }),

  // Public: Get project timeline updates
  getProjectTimeline: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const updates = await ctx.db.projectUpdate.findMany({
        where: { projectId: input.projectId },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      return updates;
    }),

  // Get all project updates for a user's projects
  getUserProjectUpdates: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // First, get all projects by this user
      const userProjects = await ctx.db.userProject.findMany({
        where: {
          profile: {
            userId: input.userId
          }
        },
        select: {
          id: true,
          title: true,
          imageUrl: true,
        }
      });

      if (userProjects.length === 0) {
        return [];
      }

      // Get all updates for these projects
      const updates = await ctx.db.projectUpdate.findMany({
        where: {
          projectId: {
            in: userProjects.map(p => p.id)
          }
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            }
          },
          project: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
            }
          },
          likes: {
            select: {
              userId: true,
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 50, // Limit to most recent 50 updates
      });

      return updates;
    }),

  // Protected: Create project update (only project owner)
  createProjectUpdate: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      title: z.string().min(1, "Update title is required"),
      content: z.string().min(1, "Update content is required"),
      weekNumber: z.number().optional(),
      imageUrls: z.array(z.string().url()).optional(),
      githubUrls: z.array(z.string().url()).optional(),
      demoUrls: z.array(z.string().url()).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the project exists and the user owns it
      const project = await ctx.db.userProject.findUnique({
        where: { id: input.projectId },
        include: {
          profile: {
            select: {
              userId: true,
            }
          }
        }
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      if (project.profile.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this project",
        });
      }

      const update = await ctx.db.projectUpdate.create({
        data: {
          projectId: input.projectId,
          userId,
          title: input.title,
          content: input.content,
          weekNumber: input.weekNumber ?? null,
          imageUrls: input.imageUrls ?? [],
          githubUrls: input.githubUrls ?? [],
          demoUrls: input.demoUrls ?? [],
          tags: input.tags ?? [],
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            }
          }
        }
      });

      return update;
    }),

  // Protected: Update project update (only author)
  updateProjectUpdate: protectedProcedure
    .input(z.object({
      updateId: z.string(),
      title: z.string().min(1, "Update title is required").optional(),
      content: z.string().min(1, "Update content is required").optional(),
      weekNumber: z.number().optional(),
      imageUrls: z.array(z.string().url()).optional(),
      githubUrls: z.array(z.string().url()).optional(),
      demoUrls: z.array(z.string().url()).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the update exists and the user owns it
      const update = await ctx.db.projectUpdate.findUnique({
        where: { id: input.updateId },
      });

      if (!update) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Update not found",
        });
      }

      if (update.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to edit this update",
        });
      }

      const updatedUpdate = await ctx.db.projectUpdate.update({
        where: { id: input.updateId },
        data: {
          ...(input.title && { title: input.title }),
          ...(input.content && { content: input.content }),
          ...(input.weekNumber !== undefined && { weekNumber: input.weekNumber }),
          ...(input.imageUrls && { imageUrls: input.imageUrls }),
          ...(input.githubUrls && { githubUrls: input.githubUrls }),
          ...(input.demoUrls && { demoUrls: input.demoUrls }),
          ...(input.tags && { tags: input.tags }),
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            }
          }
        }
      });

      return updatedUpdate;
    }),

  // Protected: Delete project update (only author)
  deleteProjectUpdate: protectedProcedure
    .input(z.object({ updateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the update exists and the user owns it
      const update = await ctx.db.projectUpdate.findUnique({
        where: { id: input.updateId },
      });

      if (!update) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Update not found",
        });
      }

      if (update.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this update",
        });
      }

      await ctx.db.projectUpdate.delete({
        where: { id: input.updateId },
      });

      return { success: true };
    }),

  // Protected: Like a project update
  likeProjectUpdate: protectedProcedure
    .input(z.object({
      updateId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if update exists
      const update = await ctx.db.projectUpdate.findUnique({
        where: { id: input.updateId },
      });

      if (!update) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Update not found",
        });
      }

      // Check if user already liked this update
      const existingLike = await ctx.db.projectUpdateLike.findUnique({
        where: {
          projectUpdateId_userId: {
            projectUpdateId: input.updateId,
            userId,
          },
        },
      });

      if (existingLike) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already liked this update",
        });
      }

      // Create like
      const like = await ctx.db.projectUpdateLike.create({
        data: {
          projectUpdateId: input.updateId,
          userId,
        },
      });

      return like;
    }),

  // Protected: Unlike a project update
  unlikeProjectUpdate: protectedProcedure
    .input(z.object({
      updateId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Find and delete the like
      const like = await ctx.db.projectUpdateLike.findUnique({
        where: {
          projectUpdateId_userId: {
            projectUpdateId: input.updateId,
            userId,
          },
        },
      });

      if (!like) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Like not found",
        });
      }

      await ctx.db.projectUpdateLike.delete({
        where: { id: like.id },
      });

      return { success: true };
    }),

  // Public: Get likes for a project update
  getUpdateLikes: publicProcedure
    .input(z.object({
      updateId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const likes = await ctx.db.projectUpdateLike.findMany({
        where: { projectUpdateId: input.updateId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        count: likes.length,
        likes,
        hasLiked: ctx.session?.user
          ? likes.some((like) => like.userId === ctx.session!.user.id)
          : false,
      };
    }),

  // Public: Get all project updates for an event
  getAllEventUpdates: publicProcedure
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
              profile: {
                select: {
                  projects: {
                    select: {
                      id: true,
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Get all project IDs from accepted residents
      const projectIds = acceptedApplications
        .filter(app => app.user?.profile?.projects?.length)
        .flatMap(app =>
          app.user!.profile!.projects.map(project => project.id)
        );

      if (projectIds.length === 0) {
        return [];
      }

      // Get all updates for these projects
      const updates = await ctx.db.projectUpdate.findMany({
        where: {
          projectId: {
            in: projectIds
          }
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            }
          },
          project: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
            }
          },
          likes: {
            select: {
              userId: true,
            }
          },
          comments: {
            select: {
              id: true,
            }
          }
        },
        orderBy: { createdAt: "desc" },
      });

      return updates;
    }),

  // Protected: Like a UserProject
  likeUserProject: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if project exists
      const project = await ctx.db.userProject.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Check if user already liked this project
      const existingLike = await ctx.db.userProjectLike.findUnique({
        where: {
          projectId_userId: {
            projectId: input.projectId,
            userId,
          },
        },
      });

      if (existingLike) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already liked this project",
        });
      }

      // Create like
      const like = await ctx.db.userProjectLike.create({
        data: {
          projectId: input.projectId,
          userId,
        },
      });

      return like;
    }),

  // Protected: Unlike a UserProject
  unlikeUserProject: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Find and delete the like
      const like = await ctx.db.userProjectLike.findUnique({
        where: {
          projectId_userId: {
            projectId: input.projectId,
            userId,
          },
        },
      });

      if (!like) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Like not found",
        });
      }

      await ctx.db.userProjectLike.delete({
        where: { id: like.id },
      });

      return { success: true };
    }),

  // Public: Get likes for a UserProject
  getUserProjectLikes: publicProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const likes = await ctx.db.userProjectLike.findMany({
        where: { projectId: input.projectId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        count: likes.length,
        likes,
        hasLiked: ctx.session?.user
          ? likes.some((like) => like.userId === ctx.session!.user.id)
          : false,
      };
    }),

  // Public: Get a single project update by ID
  getUpdateById: publicProcedure
    .input(z.object({
      updateId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const update = await ctx.db.projectUpdate.findUnique({
        where: { id: input.updateId },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              firstName: true,
              surname: true,
              image: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
            },
          },
          likes: {
            select: {
              userId: true,
            },
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  surname: true,
                  image: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!update) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Update not found",
        });
      }

      return update;
    }),

  // Protected: Create a comment on a project update
  createUpdateComment: protectedProcedure
    .input(z.object({
      updateId: z.string(),
      content: z.string().min(1, "Comment cannot be empty").max(5000, "Comment is too long"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify update exists
      const update = await ctx.db.projectUpdate.findUnique({
        where: { id: input.updateId },
      });

      if (!update) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Update not found",
        });
      }

      const comment = await ctx.db.projectUpdateComment.create({
        data: {
          projectUpdateId: input.updateId,
          userId: ctx.session.user.id,
          content: input.content,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              surname: true,
              image: true,
            },
          },
        },
      });

      return comment;
    }),

  // Protected: Update a comment
  updateUpdateComment: protectedProcedure
    .input(z.object({
      commentId: z.string(),
      content: z.string().min(1, "Comment cannot be empty").max(5000, "Comment is too long"),
    }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.projectUpdateComment.findUnique({
        where: { id: input.commentId },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      // Verify user owns this comment
      if (comment.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit your own comments",
        });
      }

      const updatedComment = await ctx.db.projectUpdateComment.update({
        where: { id: input.commentId },
        data: { content: input.content },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              surname: true,
              image: true,
            },
          },
        },
      });

      return updatedComment;
    }),

  // Protected: Delete a comment
  deleteUpdateComment: protectedProcedure
    .input(z.object({
      commentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.projectUpdateComment.findUnique({
        where: { id: input.commentId },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      // Verify user owns this comment
      if (comment.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own comments",
        });
      }

      await ctx.db.projectUpdateComment.delete({
        where: { id: input.commentId },
      });

      return { success: true };
    }),

  // Public: Get comments for a project update
  getUpdateComments: publicProcedure
    .input(z.object({
      updateId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const comments = await ctx.db.projectUpdateComment.findMany({
        where: { projectUpdateId: input.updateId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              surname: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return comments;
    }),
});