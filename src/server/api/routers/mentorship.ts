import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const mentorshipRouter = createTRPCRouter({
  // Get upcoming mentorship sessions for the current user
  getUpcomingSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await ctx.db.mentorshipSession.findMany({
      where: {
        mentorId: ctx.session.user.id,
        scheduledAt: {
          gte: new Date(), // Only future sessions
        }
      },
      include: {
        team: {
          include: {
            hackathon: {
              select: {
                name: true,
              }
            }
          }
        }
      },
      orderBy: {
        scheduledAt: "asc"
      },
      take: 10, // Limit to next 10 sessions
    });

    return sessions;
  }),

  // Get mentor stats for dashboard
  getMentorStats: protectedProcedure.query(async ({ ctx }) => {
    // Get all mentorship sessions (past and future)
    const allSessions = await ctx.db.mentorshipSession.findMany({
      where: {
        mentorId: ctx.session.user.id,
      },
      select: {
        durationMinutes: true,
        scheduledAt: true,
        teamId: true,
      }
    });

    const totalSessions = allSessions.length;
    const completedSessions = allSessions.filter(session => 
      new Date(session.scheduledAt) < new Date()
    ).length;

    const totalHours = Math.round(
      allSessions
        .filter(session => new Date(session.scheduledAt) < new Date()) // Only completed sessions
        .reduce((sum, session) => sum + session.durationMinutes, 0) / 60
    );

    // Count unique teams mentored
    const uniqueTeams = new Set(allSessions.map(session => session.teamId));
    const teamsSupported = uniqueTeams.size;

    return {
      totalSessions,
      completedSessions,
      totalHours,
      teamsSupported,
    };
  }),

  // Get recent mentorship activity
  getRecentActivity: protectedProcedure.query(async ({ ctx }) => {
    const recentSessions = await ctx.db.mentorshipSession.findMany({
      where: {
        mentorId: ctx.session.user.id,
        scheduledAt: {
          lte: new Date(), // Only past sessions for activity
        }
      },
      include: {
        team: {
          include: {
            hackathon: {
              select: {
                name: true,
              }
            },
            project: {
              select: {
                title: true,
                description: true,
              }
            }
          }
        }
      },
      orderBy: {
        scheduledAt: "desc"
      },
      take: 5, // Last 5 sessions
    });

    return recentSessions;
  }),

  // Create a new mentorship session
  createSession: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      scheduledAt: z.date(),
      durationMinutes: z.number().min(15).max(480), // 15 min to 8 hours
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.mentorshipSession.create({
        data: {
          mentorId: ctx.session.user.id,
          teamId: input.teamId,
          scheduledAt: input.scheduledAt,
          durationMinutes: input.durationMinutes,
          notes: input.notes,
        },
        include: {
          team: {
            include: {
              hackathon: {
                select: {
                  name: true,
                }
              }
            }
          }
        }
      });

      return session;
    }),

  // Update session notes
  updateSessionNotes: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      notes: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.mentorshipSession.update({
        where: { id: input.sessionId },
        data: { notes: input.notes },
        include: {
          team: {
            include: {
              hackathon: {
                select: {
                  name: true,
                }
              }
            }
          }
        }
      });

      return session;
    }),
});