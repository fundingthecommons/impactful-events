import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@prisma/client';

// Helper function to check if user has admin/staff role
function checkAdminAccess(userRole?: string | null) {
  if (!userRole || (userRole !== "admin" && userRole !== "staff")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin or staff access required",
    });
  }
}

// Input validation schemas
const CreateReviewerAssignmentSchema = z.object({
  applicationId: z.string(),
  reviewerId: z.string(),
  stage: z.enum(['SCREENING', 'DETAILED_REVIEW', 'VIDEO_REVIEW', 'CONSENSUS', 'FINAL_DECISION']),
  priority: z.number().int().min(0).default(0),
  dueDate: z.date().optional(),
  notes: z.string().optional(),
});

const BulkCreateAssignmentsSchema = z.object({
  applicationIds: z.array(z.string()).min(1),
  reviewerId: z.string(),
  stage: z.enum(['SCREENING', 'DETAILED_REVIEW', 'VIDEO_REVIEW', 'CONSENSUS', 'FINAL_DECISION']).default('SCREENING'),
  priority: z.number().int().min(0).default(0),
  dueDate: z.date().optional(),
  notes: z.string().optional(),
});

const UpdateEvaluationSchema = z.object({
  evaluationId: z.string(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED']).optional(),
  overallScore: z.number().min(0).max(10).optional(),
  overallComments: z.string().optional(),
  recommendation: z.enum(['ACCEPT', 'REJECT', 'WAITLIST', 'NEEDS_MORE_INFO']).optional(),
  confidence: z.number().int().min(1).max(5).optional(),
  timeSpentMinutes: z.number().int().min(0).optional(),
  videoWatched: z.boolean().optional(),
  videoTimestamp: z.string().optional(), // JSON string
  videoQuality: z.number().int().min(1).max(5).optional(),
  completedAt: z.date().optional(),
});

const CreateEvaluationScoreSchema = z.object({
  evaluationId: z.string(),
  criteriaId: z.string(),
  score: z.number().min(0).max(10),
  reasoning: z.string().optional(),
});

const CreateEvaluationCommentSchema = z.object({
  evaluationId: z.string(),
  questionKey: z.string().optional(),
  comment: z.string(),
  isPrivate: z.boolean().default(true),
});

const UpdateConsensusSchema = z.object({
  applicationId: z.string(),
  finalDecision: z.enum(['ACCEPT', 'REJECT', 'WAITLIST']).optional(),
  consensusScore: z.number().min(0).max(10).optional(),
  discussionNotes: z.string().optional(),
});

// Helper function to calculate weighted score
async function calculateWeightedScore(prisma: PrismaClient, evaluationId: string): Promise<number> {
  const scores = await prisma.evaluationScore.findMany({
    where: { evaluationId },
    include: { criteria: true },
  });

  if (scores.length === 0) return 0;

  const totalWeightedScore = scores.reduce((sum, score) => {
    return sum + (score.score * score.criteria.weight);
  }, 0);

  const totalWeight = scores.reduce((sum, score) => sum + score.criteria.weight, 0);
  
  return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
}

export const evaluationRouter = createTRPCRouter({
  // Get all evaluation criteria
  getCriteria: protectedProcedure
    .query(async ({ ctx }) => {
      checkAdminAccess(ctx.session.user.role);
      
      return await ctx.db.evaluationCriteria.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      });
    }),

  // Create reviewer assignment
  createAssignment: protectedProcedure
    .input(CreateReviewerAssignmentSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Create the assignment
      const assignment = await ctx.db.reviewerAssignment.create({
        data: input,
        include: {
          reviewer: { select: { id: true, name: true, email: true } },
          application: { 
            select: { 
              id: true,
              user: { select: { name: true, email: true } },
              event: { select: { name: true } }
            }
          },
        },
      });

      // Create corresponding evaluation record
      await ctx.db.applicationEvaluation.create({
        data: {
          applicationId: input.applicationId,
          reviewerId: input.reviewerId,
          assignmentId: assignment.id,
          stage: input.stage,
          status: 'PENDING',
        },
      });

      return assignment;
    }),

  // Create multiple reviewer assignments
  bulkCreateAssignments: protectedProcedure
    .input(BulkCreateAssignmentsSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const { applicationIds, reviewerId, stage, priority, dueDate, notes } = input;

      // Check for existing assignments to prevent duplicates
      const existingAssignments = await ctx.db.reviewerAssignment.findMany({
        where: {
          applicationId: { in: applicationIds },
          reviewerId,
          stage,
        },
        select: { applicationId: true },
      });

      const existingApplicationIds = new Set(existingAssignments.map(a => a.applicationId));
      const newApplicationIds = applicationIds.filter(id => !existingApplicationIds.has(id));

      if (newApplicationIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All selected applications are already assigned to this reviewer for this stage",
        });
      }

      // Create assignments in batch
      const assignmentData = newApplicationIds.map(applicationId => ({
        applicationId,
        reviewerId,
        stage,
        priority,
        dueDate,
        notes: notes ?? `Bulk assigned for ${stage.replace('_', ' ').toLowerCase()} review`,
      }));

      const assignments = await ctx.db.$transaction(async (tx) => {
        // Create assignments
        await tx.reviewerAssignment.createMany({
          data: assignmentData,
        });

        // Get created assignments with relations
        const createdAssignments = await tx.reviewerAssignment.findMany({
          where: {
            applicationId: { in: newApplicationIds },
            reviewerId,
            stage,
          },
          include: {
            reviewer: { select: { id: true, name: true, email: true } },
            application: { 
              select: { 
                id: true,
                user: { select: { name: true, email: true } },
                event: { select: { name: true } }
              }
            },
          },
        });

        // Create corresponding evaluation records
        const evaluationData = createdAssignments.map(assignment => ({
          applicationId: assignment.applicationId,
          reviewerId: assignment.reviewerId,
          assignmentId: assignment.id,
          stage: assignment.stage,
          status: 'PENDING' as const,
        }));

        await tx.applicationEvaluation.createMany({
          data: evaluationData,
        });

        return createdAssignments;
      });

      return {
        assignments,
        created: assignments.length,
        skipped: existingApplicationIds.size,
        total: applicationIds.length,
      };
    }),

  // Get assignments for a reviewer
  getMyAssignments: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      return await ctx.db.reviewerAssignment.findMany({
        where: { reviewerId: userId },
        include: {
          application: {
            select: {
              id: true,
              email: true,
              status: true,
              createdAt: true,
              user: { select: { name: true, email: true } },
              event: { select: { name: true } },
            }
          },
          evaluations: {
            select: {
              id: true,
              status: true,
              overallScore: true,
              recommendation: true,
              completedAt: true,
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { assignedAt: 'asc' }
        ],
      });
    }),

  // Get evaluation for a specific assignment
  getEvaluation: protectedProcedure
    .input(z.object({
      applicationId: z.string(),
      stage: z.enum(['SCREENING', 'DETAILED_REVIEW', 'VIDEO_REVIEW', 'CONSENSUS', 'FINAL_DECISION']),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      return await ctx.db.applicationEvaluation.findUnique({
        where: {
          applicationId_reviewerId_stage: {
            applicationId: input.applicationId,
            reviewerId: userId,
            stage: input.stage,
          }
        },
        include: {
          scores: {
            include: { criteria: true },
            orderBy: { criteria: { order: 'asc' } }
          },
          comments: {
            orderBy: { createdAt: 'desc' }
          },
          application: {
            include: {
              responses: {
                include: { question: true },
                orderBy: { question: { order: 'asc' } }
              },
              user: { select: { name: true, email: true } },
              event: { select: { name: true } },
            }
          }
        }
      });
    }),

  // Update evaluation
  updateEvaluation: protectedProcedure
    .input(UpdateEvaluationSchema)
    .mutation(async ({ ctx, input }) => {
      const { evaluationId, ...updateData } = input;
      const userId = ctx.session.user.id;

      // Verify the evaluation belongs to the current user or user is admin
      const evaluation = await ctx.db.applicationEvaluation.findUnique({
        where: { id: evaluationId },
        select: { reviewerId: true }
      });

      if (!evaluation) {
        throw new Error('Evaluation not found');
      }

      if (evaluation.reviewerId !== userId && !ctx.session.user.role?.includes('admin')) {
        throw new Error('Unauthorized to update this evaluation');
      }

      // Set completed timestamp if status is being set to COMPLETED
      const finalUpdateData = { ...updateData };
      if (updateData.status === 'COMPLETED') {
        finalUpdateData.completedAt = new Date();
      }

      const updatedEvaluation = await ctx.db.applicationEvaluation.update({
        where: { id: evaluationId },
        data: finalUpdateData,
        include: {
          scores: { include: { criteria: true } }
        }
      });

      // Recalculate overall score if scores exist
      if (updatedEvaluation.scores.length > 0) {
        const weightedScore = await calculateWeightedScore(ctx.db, evaluationId);
        await ctx.db.applicationEvaluation.update({
          where: { id: evaluationId },
          data: { overallScore: weightedScore }
        });
      }

      return updatedEvaluation;
    }),

  // Create or update evaluation score
  upsertScore: protectedProcedure
    .input(CreateEvaluationScoreSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the evaluation belongs to the current user
      const evaluation = await ctx.db.applicationEvaluation.findUnique({
        where: { id: input.evaluationId },
        select: { reviewerId: true }
      });

      if (!evaluation || evaluation.reviewerId !== userId) {
        throw new Error('Unauthorized to update this evaluation');
      }

      const score = await ctx.db.evaluationScore.upsert({
        where: {
          evaluationId_criteriaId: {
            evaluationId: input.evaluationId,
            criteriaId: input.criteriaId,
          }
        },
        create: input,
        update: {
          score: input.score,
          reasoning: input.reasoning,
        },
        include: { criteria: true }
      });

      // Recalculate overall score
      const weightedScore = await calculateWeightedScore(ctx.db, input.evaluationId);
      await ctx.db.applicationEvaluation.update({
        where: { id: input.evaluationId },
        data: { overallScore: weightedScore }
      });

      return score;
    }),

  // Add evaluation comment
  addComment: protectedProcedure
    .input(CreateEvaluationCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the evaluation belongs to the current user
      const evaluation = await ctx.db.applicationEvaluation.findUnique({
        where: { id: input.evaluationId },
        select: { reviewerId: true }
      });

      if (!evaluation || evaluation.reviewerId !== userId) {
        throw new Error('Unauthorized to add comment to this evaluation');
      }

      return await ctx.db.evaluationComment.create({
        data: input,
      });
    }),

  // Get application summary for review pipeline
  getApplicationSummary: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      return await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          user: { select: { name: true, email: true } },
          event: { select: { name: true } },
          evaluations: {
            include: {
              reviewer: { select: { name: true, email: true } },
              scores: {
                include: { criteria: true }
              }
            }
          },
          consensus: true,
          reviewerAssignments: {
            include: {
              reviewer: { select: { name: true, email: true } }
            }
          }
        }
      });
    }),

  // Update consensus decision
  updateConsensus: protectedProcedure
    .input(UpdateConsensusSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const { applicationId, ...consensusData } = input;

      return await ctx.db.reviewConsensus.upsert({
        where: { applicationId },
        create: {
          applicationId,
          ...consensusData,
          decidedBy: ctx.session.user.id,
          decidedAt: consensusData.finalDecision ? new Date() : undefined,
        },
        update: {
          ...consensusData,
          decidedBy: ctx.session.user.id,
          decidedAt: consensusData.finalDecision ? new Date() : undefined,
        }
      });
    }),

  // Get review pipeline overview
  getReviewPipeline: protectedProcedure
    .input(z.object({
      reviewerId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const applications = await ctx.db.application.findMany({
        where: {
          status: { in: ['SUBMITTED', 'UNDER_REVIEW'] }
        },
        include: {
          user: { select: { name: true, email: true } },
          event: { select: { name: true } },
          evaluations: {
            select: {
              stage: true,
              status: true,
              overallScore: true,
              recommendation: true,
              reviewerId: true,
              reviewer: { select: { name: true } }
            }
          },
          consensus: {
            select: { 
              finalDecision: true,
              consensusScore: true,
              decidedAt: true,
            }
          }
        }
      });

      // Filter by reviewer if specified
      let filteredApplications = applications;
      if (input?.reviewerId) {
        filteredApplications = applications.filter(app =>
          app.evaluations.some(evaluation => evaluation.reviewerId === input.reviewerId)
        );
      }

      // Simplified 2-stage pipeline: Application Review → Consensus
      const pipeline = {
        applicationReview: filteredApplications.filter(app => 
          // Applications that have no completed evaluations or are still being reviewed
          !app.evaluations.some(e => e.status === 'COMPLETED') && !app.consensus?.finalDecision
        ),
        consensus: filteredApplications.filter(app =>
          // Applications that have at least one completed evaluation but no final decision
          app.evaluations.some(e => e.status === 'COMPLETED') &&
          !app.consensus?.finalDecision
        ),
        finalDecision: filteredApplications.filter(app => app.consensus?.finalDecision)
      };

      return pipeline;
    }),

  // Get consensus data for an application (all completed evaluations)
  getConsensusData: protectedProcedure
    .input(z.object({
      applicationId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          user: { select: { name: true, email: true } },
          event: { select: { name: true } },
          evaluations: {
            where: { status: 'COMPLETED' },
            include: {
              reviewer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
              scores: {
                include: { criteria: true },
                orderBy: { criteria: { order: 'asc' } }
              },
              comments: {
                orderBy: { createdAt: 'desc' }
              },
            },
            orderBy: { completedAt: 'desc' }
          },
          consensus: true,
          responses: {
            include: { question: true },
            orderBy: { question: { order: 'asc' } }
          },
        }
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      return application;
    }),
});