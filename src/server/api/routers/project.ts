import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type EmailResult } from "~/server/email/emailService";
import { env } from "~/env";

// Helper function to send project update notifications to Telegram channel
async function sendProjectUpdateNotification(params: {
  updateTitle: string;
  updateContent: string;
  projectTitle: string;
  authorName: string;
  updateUrl: string;
  imageUrls?: string[];
}) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHANNEL_ID;
  const topicId = env.TELEGRAM_UPDATES_TOPIC_ID;

  if (!botToken) {
    console.warn("TELEGRAM_BOT_TOKEN not configured, skipping notification");
    return;
  }

  if (!chatId) {
    console.warn("TELEGRAM_CHANNEL_ID not configured, skipping notification");
    return;
  }

  try {
    // Truncate content preview if too long
    const contentPreview = params.updateContent.length > 200
      ? `${params.updateContent.substring(0, 200)}...`
      : params.updateContent;

    const imageInfo = params.imageUrls && params.imageUrls.length > 0
      ? `\n📷 ${params.imageUrls.length} image${params.imageUrls.length > 1 ? 's' : ''}`
      : '';

    const message = `
📊 *New Project Update*

*Project:* ${params.projectTitle}
*Update:* ${params.updateTitle}

${contentPreview}

👤 Posted by: ${params.authorName}${imageInfo}

[View full update](${params.updateUrl})
`.trim();

    // Build request body
    const requestBody: {
      chat_id: string;
      text: string;
      parse_mode: string;
      disable_web_page_preview: boolean;
      message_thread_id?: string;
    } = {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    };

    // Only include topic ID if configured
    if (topicId) {
      requestBody.message_thread_id = topicId;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json() as { description?: string };
      console.error("Failed to send Telegram notification:", errorData.description ?? "Unknown error");
    }
  } catch (error) {
    console.error("Error sending Telegram notification:", error instanceof Error ? error.message : "Unknown error");
  }
}

// Helper function to send update comment notifications to Telegram channel
async function sendUpdateCommentChannelNotification(params: {
  projectTitle: string;
  updateTitle: string;
  commenterName: string;
  commentContent: string;
  updateUrl: string;
}) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHANNEL_ID;
  const topicId = env.TELEGRAM_UPDATES_TOPIC_ID;

  if (!botToken) {
    console.warn("TELEGRAM_BOT_TOKEN not configured, skipping notification");
    return;
  }

  if (!chatId) {
    console.warn("TELEGRAM_CHANNEL_ID not configured, skipping notification");
    return;
  }

  try {
    // Truncate comment preview if too long
    const commentPreview = params.commentContent.length > 200
      ? `${params.commentContent.substring(0, 200)}...`
      : params.commentContent;

    const message = `
💬 *New Comment on Update*

*Project:* ${params.projectTitle}
*Update:* ${params.updateTitle}

${commentPreview}

👤 Comment by: ${params.commenterName}

[View conversation](${params.updateUrl})
`.trim();

    // Build request body
    const requestBody: {
      chat_id: string;
      text: string;
      parse_mode: string;
      disable_web_page_preview: boolean;
      message_thread_id?: string;
    } = {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    };

    // Only include topic ID if configured
    if (topicId) {
      requestBody.message_thread_id = topicId;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json() as { description?: string };
      console.error("Failed to send Telegram comment notification:", errorData.description ?? "Unknown error");
    }
  } catch (error) {
    console.error("Error sending Telegram comment notification:", error instanceof Error ? error.message : "Unknown error");
  }
}

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
                      repositories: {
                        select: {
                          id: true,
                          url: true,
                          name: true,
                          description: true,
                          isPrimary: true,
                          order: true,
                        },
                        orderBy: [
                          { isPrimary: "desc" },
                          { order: "asc" },
                        ],
                      },
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
          repositories: {
            select: {
              id: true,
              url: true,
              name: true,
              description: true,
              isPrimary: true,
              order: true,
            },
            orderBy: [
              { isPrimary: "desc" },
              { order: "asc" },
            ],
          },
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
        repositories: project.repositories,
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
        orderBy: { updateDate: "desc" }
      });

      return updates;
    }),

  // Get all project updates for a user's projects
  getUserProjectUpdates: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get all projects where the user is the owner
      const ownedProjects = await ctx.db.userProject.findMany({
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

      // Get all projects where the user is a collaborator
      const collaboratorProjects = await ctx.db.projectCollaborator.findMany({
        where: {
          userId: input.userId
        },
        select: {
          project: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
            }
          }
        }
      });

      // Combine both lists of projects
      const allProjects = [
        ...ownedProjects,
        ...collaboratorProjects.map(c => c.project)
      ];

      if (allProjects.length === 0) {
        return [];
      }

      // Get all updates for these projects
      const updates = await ctx.db.projectUpdate.findMany({
        where: {
          projectId: {
            in: allProjects.map(p => p.id)
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
        orderBy: { updateDate: "desc" },
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
      updateDate: z.date().optional(),
      imageUrls: z.array(z.string().url()).optional(),
      githubUrls: z.array(z.string().url()).optional(),
      demoUrls: z.array(z.string().url()).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the project exists and the user can edit it (owner or collaborator with edit permissions)
      const project = await ctx.db.userProject.findUnique({
        where: { id: input.projectId },
        include: {
          profile: {
            select: {
              userId: true,
            }
          },
          collaborators: {
            where: {
              userId,
            },
            select: {
              canEdit: true,
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

      // Check if user is the owner or a collaborator with edit permissions
      const isOwner = project.profile.userId === userId;
      const isCollaboratorWithEdit = project.collaborators.some(c => c.canEdit);

      if (!isOwner && !isCollaboratorWithEdit) {
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
          updateDate: input.updateDate ?? new Date(),
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

      // Send Telegram notification
      // Get user's accepted application to find eventId
      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          userId,
          status: "ACCEPTED",
        },
        select: {
          eventId: true,
        },
        take: 1,
      });

      const eventId = acceptedApplications[0]?.eventId ?? "funding-commons-residency-2025";
      const authorName = update.author.name ?? "Someone";
      const updateUrl = `https://platform.fundingthecommons.io/events/${eventId}/updates/${update.id}`;

      void sendProjectUpdateNotification({
        updateTitle: update.title,
        updateContent: update.content,
        projectTitle: project.title,
        authorName,
        updateUrl,
        imageUrls: update.imageUrls,
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
      updateDate: z.date().optional(),
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
          ...(input.updateDate !== undefined && { updateDate: input.updateDate }),
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

      // Verify the update exists and the user can delete it
      const update = await ctx.db.projectUpdate.findUnique({
        where: { id: input.updateId },
        include: {
          project: {
            include: {
              profile: {
                select: {
                  userId: true,
                }
              },
              collaborators: {
                where: {
                  userId,
                },
                select: {
                  canEdit: true,
                }
              }
            }
          }
        }
      });

      if (!update) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Update not found",
        });
      }

      // Check if user is the update author, project owner, or collaborator with edit permissions
      const isAuthor = update.userId === userId;
      const isProjectOwner = update.project.profile.userId === userId;
      const isCollaboratorWithEdit = update.project.collaborators.some(c => c.canEdit);

      if (!isAuthor && !isProjectOwner && !isCollaboratorWithEdit) {
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

      // Get liker's current kudos for transfer calculation
      const liker = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { kudos: true },
      });

      if (!liker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Calculate kudos transfer (2% of liker's kudos)
      const transferAmount = liker.kudos * 0.02;

      // Check if user has sufficient kudos
      if (liker.kudos < transferAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient kudos to like this update",
        });
      }

      // Perform kudos transfer in a transaction
      const [like] = await ctx.db.$transaction([
        // Create the like with transfer data
        ctx.db.projectUpdateLike.create({
          data: {
            projectUpdateId: input.updateId,
            userId,
            kudosTransferred: transferAmount,
            likerKudosAtTime: liker.kudos,
          },
        }),
        // Deduct kudos from liker
        ctx.db.user.update({
          where: { id: userId },
          data: { kudos: { decrement: transferAmount } },
        }),
        // Add kudos to update author
        ctx.db.user.update({
          where: { id: update.userId },
          data: { kudos: { increment: transferAmount } },
        }),
      ]);

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
              profile: {
                select: {
                  avatarUrl: true,
                }
              }
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
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  surname: true,
                  image: true,
                  profile: {
                    select: {
                      avatarUrl: true,
                    }
                  }
                }
              },
              likes: {
                select: {
                  userId: true,
                }
              },
              _count: {
                select: {
                  likes: true,
                }
              }
            },
            orderBy: { createdAt: "desc" },
            take: 2, // Last 2 comments only
          }
        },
        orderBy: { updateDate: "desc" },
      });

      return updates;
    }),

  // Get user metrics for event residents (for badges/leaderboard)
  getEventUserMetrics: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get accepted residents for this event
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
                      metrics: {
                        select: {
                          id: true,
                        }
                      },
                      updates: {
                        select: {
                          id: true,
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Get all praise transactions with proper typing
      const praiseTransactions = await ctx.db.praise.findMany({
        select: {
          senderId: true,
          recipientId: true,
        }
      }) as Array<{ senderId: string; recipientId: string }>;

      // Calculate metrics for each user
      const userMetrics = acceptedApplications
        .filter(app => app.user)
        .map(app => {
          const userId = app.user!.id;
          const projects = app.user!.profile?.projects ?? [];

          // Count projects with at least one metric
          const projectsWithMetrics = projects.filter(
            p => p.metrics && p.metrics.length > 0
          ).length;

          // Count total updates across all projects
          const updateCount = projects.reduce(
            (sum, p) => sum + (p.updates?.length ?? 0),
            0
          );

          // Count praise sent and received
          const praiseSent = praiseTransactions.filter(
            t => t.senderId === userId
          ).length;

          const praiseReceived = praiseTransactions.filter(
            t => t.recipientId === userId
          ).length;

          // Calculate kudos using the same formula as leaderboard
          const KUDOS_CONSTANTS = {
            BASE_KUDOS: 130,
            UPDATE_WEIGHT: 10,
            METRICS_WEIGHT: 10,
            BACKFILL_PRAISE_VALUE: 5,
          };

          const kudos = Math.max(0,
            KUDOS_CONSTANTS.BASE_KUDOS +
            (updateCount * KUDOS_CONSTANTS.UPDATE_WEIGHT) +
            (projectsWithMetrics * KUDOS_CONSTANTS.METRICS_WEIGHT) +
            (praiseReceived * KUDOS_CONSTANTS.BACKFILL_PRAISE_VALUE) -
            (praiseSent * KUDOS_CONSTANTS.BACKFILL_PRAISE_VALUE)
          );

          return {
            userId,
            kudos,
            updates: updateCount,
            projects: projectsWithMetrics,
            praiseReceived,
            praiseSent,
          };
        });

      // Return as a map for easy lookup by userId
      const metricsMap: Record<string, {
        userId: string;
        kudos: number;
        updates: number;
        projects: number;
        praiseReceived: number;
        praiseSent: number;
      }> = Object.fromEntries(
        userMetrics.map(m => [m.userId, m])
      );

      return metricsMap;
    }),

  // Protected: Like a UserProject
  likeUserProject: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if project exists and get project owner
      const project = await ctx.db.userProject.findUnique({
        where: { id: input.projectId },
        include: {
          profile: {
            select: { userId: true },
          },
        },
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

      // Get liker's current kudos for transfer calculation
      const liker = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { kudos: true },
      });

      if (!liker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Calculate kudos transfer (2% of liker's kudos)
      const transferAmount = liker.kudos * 0.02;

      // Check if user has sufficient kudos
      if (liker.kudos < transferAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient kudos to like this project",
        });
      }

      // Perform kudos transfer in a transaction
      const [like] = await ctx.db.$transaction([
        // Create the like with transfer data
        ctx.db.userProjectLike.create({
          data: {
            projectId: input.projectId,
            userId,
            kudosTransferred: transferAmount,
            likerKudosAtTime: liker.kudos,
          },
        }),
        // Deduct kudos from liker
        ctx.db.user.update({
          where: { id: userId },
          data: { kudos: { decrement: transferAmount } },
        }),
        // Add kudos to project owner
        ctx.db.user.update({
          where: { id: project.profile.userId },
          data: { kudos: { increment: transferAmount } },
        }),
      ]);

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
              profile: {
                select: {
                  avatarUrl: true,
                }
              }
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
                  profile: {
                    select: {
                      avatarUrl: true,
                    }
                  }
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
      eventId: z.string(), // Required for building notification URL
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify update exists and get project info
      const update = await ctx.db.projectUpdate.findUnique({
        where: { id: input.updateId },
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (!update) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Update not found",
        });
      }

      // Create the comment
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

      // Send notifications to project members asynchronously (both email and Telegram)
      // Use void to explicitly ignore the promise (fire-and-forget pattern)
      void (async () => {
        try {
          const commenterName = comment.user.name ??
            `${comment.user.firstName ?? ""} ${comment.user.surname ?? ""}`.trim() ??
            "Someone";

          const updateUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://platform.fundingthecommons.io"}/events/${input.eventId}/updates/${input.updateId}`;

          // Get update author to ensure they're notified
          const updateAuthor = await ctx.db.user.findUnique({
            where: { id: update.userId },
            include: {
              profile: {
                select: {
                  telegramChatId: true,
                  telegramHandle: true,
                },
              },
            },
          });

          // Get all project collaborators (excluding the commenter)
          const collaborators = await ctx.db.projectCollaborator.findMany({
            where: {
              projectId: update.project.id,
              userId: { not: ctx.session.user.id },
            },
            include: {
              user: {
                include: {
                  profile: {
                    select: {
                      telegramChatId: true,
                      telegramHandle: true,
                    },
                  },
                },
              },
            },
          });

          // Combine update author and collaborators, deduplicate by userId
          const allRecipients = new Map<string, typeof updateAuthor>();

          // Add update author first (if not the commenter)
          if (updateAuthor && update.userId !== ctx.session.user.id) {
            allRecipients.set(updateAuthor.id, updateAuthor);
          }

          // Add collaborators (will skip duplicates due to Map)
          for (const collab of collaborators) {
            if (!allRecipients.has(collab.user.id)) {
              allRecipients.set(collab.user.id, collab.user);
            }
          }

          const recipients = Array.from(allRecipients.values());

          let telegramSuccessCount = 0;
          let telegramFailureCount = 0;
          let emailSuccessCount = 0;
          let emailFailureCount = 0;

          // Send Telegram notifications
          const { BotNotificationService } = await import("~/server/services/botNotificationService");
          const botNotificationService = new BotNotificationService(ctx.db);

          const telegramResults = await botNotificationService.sendUpdateCommentNotifications({
            commentId: comment.id,
            updateId: input.updateId,
            projectId: update.project.id,
            eventId: input.eventId,
            commenterUserId: ctx.session.user.id,
            commenterName,
            commentContent: input.content,
            updateUrl,
          });

          telegramSuccessCount = telegramResults.filter(r => r.success).length;
          telegramFailureCount = telegramResults.filter(r => !r.success).length;

          // Send channel notification to Telegram topic
          void sendUpdateCommentChannelNotification({
            projectTitle: update.project.title,
            updateTitle: update.title,
            commenterName,
            commentContent: input.content,
            updateUrl,
          });

          // Send Email notifications
          const { getEmailService } = await import("~/server/email/emailService");
          const emailService = getEmailService(ctx.db);

          const emailPromises = recipients
            .filter(recipient => recipient?.email)
            .map(async (recipient): Promise<EmailResult> => {
              const recipientName = recipient!.name ??
                `${recipient!.firstName ?? ""} ${recipient!.surname ?? ""}`.trim() ??
                "Team Member";

              return emailService.sendUpdateCommentEmail({
                recipientEmail: recipient!.email!,
                recipientName,
                commenterName,
                commentContent: input.content,
                updateUrl,
                projectTitle: update.project.title,
                eventId: input.eventId,
                commentId: comment.id,
                updateId: input.updateId,
                projectId: update.project.id,
              });
            });

          const emailResults = await Promise.allSettled(emailPromises);

          emailSuccessCount = emailResults.filter(
            r => r.status === 'fulfilled' && r.value.success
          ).length;
          emailFailureCount = emailResults.filter(
            r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
          ).length;

          console.log(
            `Update comment notifications for comment ${comment.id}: ` +
            `Telegram (${telegramSuccessCount} sent, ${telegramFailureCount} failed), ` +
            `Email (${emailSuccessCount} sent, ${emailFailureCount} failed)`
          );
        } catch (error) {
          // Log error but don't fail the comment creation
          console.error("Failed to send update comment notifications:", error);
        }
      })();

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
          likes: {
            select: {
              userId: true,
            }
          },
          _count: {
            select: {
              likes: true,
            }
          }
        },
        orderBy: { createdAt: "desc" },
      });

      return comments;
    }),

  // Protected: Like a comment on a project update
  likeUpdateComment: protectedProcedure
    .input(z.object({
      commentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if comment exists
      const comment = await ctx.db.projectUpdateComment.findUnique({
        where: { id: input.commentId },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      // Check if user already liked this comment
      const existingLike = await ctx.db.projectUpdateCommentLike.findUnique({
        where: {
          commentId_userId: {
            commentId: input.commentId,
            userId,
          },
        },
      });

      if (existingLike) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already liked this comment",
        });
      }

      // Get liker's current kudos for transfer calculation
      const liker = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { kudos: true },
      });

      if (!liker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Calculate kudos transfer (2% of liker's kudos)
      const transferAmount = liker.kudos * 0.02;

      // Check if user has sufficient kudos
      if (liker.kudos < transferAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient kudos to like this comment",
        });
      }

      // Perform kudos transfer in a transaction
      const [like] = await ctx.db.$transaction([
        // Create the like with transfer data
        ctx.db.projectUpdateCommentLike.create({
          data: {
            commentId: input.commentId,
            userId,
            kudosTransferred: transferAmount,
            likerKudosAtTime: liker.kudos,
          },
        }),
        // Deduct kudos from liker
        ctx.db.user.update({
          where: { id: userId },
          data: { kudos: { decrement: transferAmount } },
        }),
        // Add kudos to comment author
        ctx.db.user.update({
          where: { id: comment.userId },
          data: { kudos: { increment: transferAmount } },
        }),
      ]);

      return like;
    }),

  // Protected: Unlike a comment on a project update
  unlikeUpdateComment: protectedProcedure
    .input(z.object({
      commentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Find and delete the like
      const like = await ctx.db.projectUpdateCommentLike.findUnique({
        where: {
          commentId_userId: {
            commentId: input.commentId,
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

      await ctx.db.projectUpdateCommentLike.delete({
        where: { id: like.id },
      });

      return { success: true };
    }),
});