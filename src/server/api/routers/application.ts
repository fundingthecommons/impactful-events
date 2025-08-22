import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { 
  checkApplicationCompleteness, 
  updateApplicationCompletionStatus,
  sendSubmissionNotification 
} from "~/server/api/utils/applicationCompletion";

// Input schemas
const CreateApplicationInputSchema = z.object({
  eventId: z.string(),
  language: z.string().default("en"),
});

const UpdateApplicationResponseSchema = z.object({
  applicationId: z.string(),
  questionId: z.string(),
  answer: z.string(),
});

const SubmitApplicationSchema = z.object({
  applicationId: z.string(),
});

const UpdateApplicationStatusSchema = z.object({
  applicationId: z.string(),
  status: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED"]),
});

const BulkUpdateApplicationStatusSchema = z.object({
  applicationIds: z.array(z.string()),
  status: z.enum(["UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED"]),
});

const CreateQuestionSchema = z.object({
  eventId: z.string(),
  questionKey: z.string(),
  questionEn: z.string(),
  questionEs: z.string(),
  questionType: z.enum(["TEXT", "TEXTAREA", "EMAIL", "PHONE", "URL", "SELECT", "MULTISELECT", "CHECKBOX", "NUMBER"]),
  required: z.boolean().default(true),
  options: z.array(z.string()).default([]),
  order: z.number(),
});

const ImportLegacyApplicationSchema = z.object({
  email: z.string().email(),
  eventId: z.string(),
  responses: z.record(z.string()), // questionKey -> answer
  source: z.enum(["google_form", "notion_form"]),
  sourceId: z.string().optional(),
});

// Helper function to check if user has admin/staff role
function checkAdminAccess(userRole?: string | null) {
  if (!userRole || (userRole !== "admin" && userRole !== "staff")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin or staff access required",
    });
  }
}

export const applicationRouter = createTRPCRouter({
  // Get all applications for the current user
  getUserApplications: protectedProcedure.query(async ({ ctx }) => {
    const applications = await ctx.db.application.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        event: true,
        responses: {
          include: {
            question: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return applications;
  }),

  // Get user's application for a specific event
  getApplication: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const application = await ctx.db.application.findUnique({
        where: {
          userId_eventId: {
            userId: ctx.session.user.id,
            eventId: input.eventId,
          },
        },
        include: {
          event: true,
          responses: {
            include: {
              question: true,
            },
            orderBy: {
              question: {
                order: "asc",
              },
            },
          },
        },
      });
      return application;
    }),

  // Create or get existing application for an event
  createApplication: protectedProcedure
    .input(CreateApplicationInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if application already exists
      const existing = await ctx.db.application.findUnique({
        where: {
          userId_eventId: {
            userId: ctx.session.user.id,
            eventId: input.eventId,
          },
        },
      });

      if (existing) {
        return existing;
      }

      // Create new application
      const application = await ctx.db.application.create({
        data: {
          userId: ctx.session.user.id,
          eventId: input.eventId,
          email: ctx.session.user.email!,
          language: input.language,
          status: "DRAFT",
        },
        include: {
          event: true,
          responses: {
            include: {
              question: true,
            },
          },
        },
      });

      return application;
    }),

  // Get application completion status
  getApplicationCompletion: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify the application belongs to the current user
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
      });

      if (!application || application.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Application not found or access denied",
        });
      }

      const completionResult = await checkApplicationCompleteness(ctx.db, input.applicationId);
      
      return {
        ...completionResult,
        isComplete: application.isComplete,
        completedAt: application.completedAt,
        status: application.status,
      };
    }),

  // Update a response to a question
  updateResponse: protectedProcedure
    .input(UpdateApplicationResponseSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the application belongs to the current user
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
      });

      if (!application || application.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Application not found or access denied",
        });
      }

      // Update or create the response with retry logic for race conditions
      let response;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          response = await ctx.db.applicationResponse.upsert({
            where: {
              applicationId_questionId: {
                applicationId: input.applicationId,
                questionId: input.questionId,
              },
            },
            update: {
              answer: input.answer,
            },
            create: {
              applicationId: input.applicationId,
              questionId: input.questionId,
              answer: input.answer,
            },
            include: {
              question: true,
            },
          });
          break; // Success, exit the retry loop
        } catch (error: unknown) {
          retryCount++;
          
          // Check if it's a unique constraint error
          if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            console.log(`Unique constraint error on attempt ${retryCount}, retrying...`);
            
            if (retryCount >= maxRetries) {
              // Final attempt: just try to update existing record
              const existingResponse = await ctx.db.applicationResponse.findUnique({
                where: {
                  applicationId_questionId: {
                    applicationId: input.applicationId,
                    questionId: input.questionId,
                  },
                },
                include: {
                  question: true,
                },
              });
              
              if (existingResponse) {
                response = await ctx.db.applicationResponse.update({
                  where: { id: existingResponse.id },
                  data: { answer: input.answer },
                  include: {
                    question: true,
                  },
                });
                break;
              }
            }
            
            // Wait a bit before retrying to avoid immediate conflict
            await new Promise(resolve => setTimeout(resolve, 50 * retryCount));
          } else {
            // Non-constraint error, don't retry
            throw error;
          }
        }
      }
      
      if (!response) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save response after multiple attempts",
        });
      }

      // Check if application completion status has changed
      try {
        const completionResult = await checkApplicationCompleteness(ctx.db, input.applicationId);
        
        // Update completion status in database (may also revert SUBMITTED to DRAFT)
        const updateResult = await updateApplicationCompletionStatus(ctx.db, input.applicationId, completionResult);
        
        // Log status reversion for debugging
        if (updateResult.statusReverted) {
          console.log(`✏️ Application ${input.applicationId} status reverted from SUBMITTED to DRAFT due to field edit`);
        }
        
        // Note: We don't send emails just for field completion anymore
        // Users should only get emails for actual submission, not just filling fields
        if (completionResult.wasJustCompleted) {
          console.log(`✅ Application ${input.applicationId} became complete - in-browser notification will show, no email sent`);
        }
      } catch (error) {
        // Log error but don't fail the response update
        console.error('Error checking application completeness:', error);
      }

      return response;
    }),

  // Submit application (change status from DRAFT to SUBMITTED)
  submitApplication: protectedProcedure
    .input(SubmitApplicationSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the application belongs to the current user
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          responses: {
            include: {
              question: true,
            },
          },
        },
      });

      if (!application || application.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Application not found or access denied",
        });
      }

      if (application.status !== "DRAFT") {
        console.log(`Submit attempt on non-DRAFT application: ${input.applicationId}, current status: ${application.status}, user: ${ctx.session.user.id}`);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Application has already been submitted (current status: ${application.status})`,
        });
      }

      // Check required questions are answered
      const requiredQuestions = await ctx.db.applicationQuestion.findMany({
        where: {
          eventId: application.eventId,
          required: true,
        },
      });

      const answeredQuestionIds = new Set(
        application.responses.map(r => r.questionId)
      );

      const missingRequired = requiredQuestions.filter(
        q => !answeredQuestionIds.has(q.id)
      );

      if (missingRequired.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Please answer all required questions: ${missingRequired.map(q => q.questionKey).join(", ")}`,
        });
      }

      // Submit the application
      const submitted = await ctx.db.application.update({
        where: { id: input.applicationId },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
        include: {
          event: true,
          responses: {
            include: {
              question: true,
            },
          },
        },
      });

      // Send submission confirmation email now that application is actually submitted
      try {
        await sendSubmissionNotification(ctx.db, input.applicationId);
        console.log(`📧 Submission confirmation email sent for application ${input.applicationId}`);
      } catch (error) {
        // Log error but don't fail the submission
        console.error('Failed to send submission notification email:', error);
      }

      return submitted;
    }),

  // Get questions for an event
  getEventQuestions: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const questions = await ctx.db.applicationQuestion.findMany({
        where: { eventId: input.eventId },
        orderBy: { order: "asc" },
      });
      return questions;
    }),

  // Admin: Get all applications for an event
  getEventApplications: protectedProcedure
    .input(z.object({ 
      eventId: z.string(),
      status: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const applications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          ...(input.status && { status: input.status }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          responses: {
            include: {
              question: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return applications;
    }),

  // Admin: Update application status
  updateApplicationStatus: protectedProcedure
    .input(UpdateApplicationStatusSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const application = await ctx.db.application.update({
        where: { id: input.applicationId },
        data: { status: input.status },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          event: true,
        },
      });

      // TODO: Send notification email when status changes
      console.log(`Application ${input.applicationId} status updated to ${input.status}`);

      return application;
    }),

  // Admin: Bulk update application status
  bulkUpdateApplicationStatus: protectedProcedure
    .input(BulkUpdateApplicationStatusSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const applications = await ctx.db.application.updateMany({
        where: {
          id: {
            in: input.applicationIds,
          },
        },
        data: {
          status: input.status,
        },
      });

      // TODO: Send notification emails for status changes
      console.log(`Bulk updated ${applications.count} applications to status ${input.status}`);

      return applications;
    }),

  // Admin: Create questions for an event
  createEventQuestion: protectedProcedure
    .input(CreateQuestionSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const question = await ctx.db.applicationQuestion.create({
        data: input,
      });

      return question;
    }),

  // Admin: Import legacy application
  importLegacyApplication: protectedProcedure
    .input(ImportLegacyApplicationSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Check if application already exists for this email/event
      const existing = await ctx.db.application.findFirst({
        where: {
          email: input.email,
          eventId: input.eventId,
        },
      });

      if (existing) {
        return { skipped: true, application: existing };
      }

      // Create application without userId (legacy data)
      const application = await ctx.db.application.create({
        data: {
          eventId: input.eventId,
          email: input.email,
          status: "SUBMITTED",
          submittedAt: new Date(),
          ...(input.source === "google_form" && input.sourceId && {
            googleFormId: input.sourceId,
          }),
          ...(input.source === "notion_form" && input.sourceId && {
            notionPageId: input.sourceId,
          }),
        },
      });

      // Get questions for the event
      const questions = await ctx.db.applicationQuestion.findMany({
        where: { eventId: input.eventId },
      });

      // Create responses for matching questions
      const questionMap = new Map(questions.map(q => [q.questionKey, q]));
      const responses = [];

      for (const [questionKey, answer] of Object.entries(input.responses)) {
        const question = questionMap.get(questionKey);
        if (question && answer) {
          responses.push({
            applicationId: application.id,
            questionId: question.id,
            answer,
          });
        }
      }

      if (responses.length > 0) {
        await ctx.db.applicationResponse.createMany({
          data: responses,
        });
      }

      return { 
        skipped: false, 
        application: await ctx.db.application.findUnique({
          where: { id: application.id },
          include: {
            responses: {
              include: {
                question: true,
              },
            },
          },
        }),
      };
    }),

  // Check if user can apply to event (has no existing application)
  canApplyToEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const existing = await ctx.db.application.findUnique({
        where: {
          userId_eventId: {
            userId: ctx.session.user.id,
            eventId: input.eventId,
          },
        },
      });

      return { canApply: !existing, hasApplication: !!existing, application: existing };
    }),

  // Admin: Delete application responses (for testing missing fields)
  deleteApplicationResponse: protectedProcedure
    .input(z.object({
      applicationId: z.string(),
      questionKeys: z.array(z.string()), // Array of question keys to delete responses for
    }))
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Find the questions by their keys for this application's event
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: { event: true },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      const questions = await ctx.db.applicationQuestion.findMany({
        where: {
          eventId: application.eventId,
          questionKey: {
            in: input.questionKeys,
          },
        },
      });

      // Delete the responses for these questions
      const deletedResponses = await ctx.db.applicationResponse.deleteMany({
        where: {
          applicationId: input.applicationId,
          questionId: {
            in: questions.map(q => q.id),
          },
        },
      });

      return {
        deletedCount: deletedResponses.count,
        deletedQuestions: questions.map(q => q.questionKey),
      };
    }),

  // Admin: Update user name for an application
  updateApplicationUserName: protectedProcedure
    .input(z.object({
      applicationId: z.string(),
      name: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Get the application to find the user
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: { user: true },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      if (application.user) {
        // Update the user's name
        await ctx.db.user.update({
          where: { id: application.user.id },
          data: { name: input.name },
        });
      }

      // Return updated application
      return await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          responses: {
            include: {
              question: true,
            },
          },
        },
      });
    }),
});