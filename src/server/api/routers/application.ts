import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { type Prisma } from "@prisma/client";

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
import { captureApiError, captureEmailError } from "~/utils/errorCapture";

// Input schemas
const CreateApplicationInputSchema = z.object({
  eventId: z.string(),
  language: z.string().default("en"),
  applicationType: z.enum(["RESIDENT", "MENTOR"]).default("RESIDENT"),
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
  status: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED", "CANCELLED"]),
});

const BulkUpdateApplicationStatusSchema = z.object({
  applicationIds: z.array(z.string()),
  status: z.enum(["DRAFT", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED", "CANCELLED"]),
});

const BulkUpdateApplicationResponsesSchema = z.object({
  applicationId: z.string(),
  responses: z.array(z.object({
    questionId: z.string(),
    answer: z.string(),
  })),
});

const UpdateWaitlistOrderSchema = z.object({
  applicationId: z.string(),
  position: z.number().int().positive().optional(), // null to clear manual override
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

const CreateSponsoredApplicationSchema = z.object({
  eventId: z.string(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  organization: z.string().optional(),
  notes: z.string().optional(),
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
    .input(z.object({ 
      eventId: z.string(),
      applicationType: z.enum(["RESIDENT", "MENTOR"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const application = await ctx.db.application.findFirst({
        where: {
          userId: ctx.session.user.id,
          eventId: input.eventId,
          ...(input.applicationType && { applicationType: input.applicationType }),
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
      console.log('🔍 createApplication called with:', {
        userId: ctx.session.user.id,
        eventId: input.eventId,
        applicationType: input.applicationType,
        language: input.language
      });

      // Check if user has latePass access or is admin/mentor
      const isAdmin = ctx.session.user.role === "admin" || ctx.session.user.role === "staff";
      
      // Check if user is a mentor for this event
      const mentorRole = await ctx.db.userRole.findFirst({
        where: {
          userId: ctx.session.user.id,
          eventId: input.eventId,
          role: {
            name: "mentor"
          }
        }
      });
      const isMentor = !!mentorRole;

      // Get event details to check if applications are open
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true
        }
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Check if applications are currently open (within deadline)
      const now = new Date();
      const applicationsOpen = now <= event.startDate; // Applications close when event starts
      
      console.log('🕐 Application timing check:', {
        now: now.toISOString(),
        eventStart: event.startDate.toISOString(),
        applicationsOpen,
        isAdmin,
        isMentor
      });

      // If applications are closed and user is not admin/mentor, they need latePass
      if (!applicationsOpen && !isAdmin && !isMentor) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Applications for this event are closed. A late pass is required to apply.",
        });
      }

      // Check if application already exists (matches the unique constraint: userId + eventId)
      const existing = await ctx.db.application.findFirst({
        where: {
          userId: ctx.session.user.id,
          eventId: input.eventId,
        },
      });

      if (existing) {
        console.log('📋 Found existing application:', {
          id: existing.id,
          currentType: existing.applicationType,
          requestedType: input.applicationType
        });

        // If existing application has different type, update it to the requested type
        if (existing.applicationType !== input.applicationType) {
          console.log('🔄 Updating application type from', existing.applicationType, 'to', input.applicationType);
          const updated = await ctx.db.application.update({
            where: { id: existing.id },
            data: { applicationType: input.applicationType },
            include: {
              event: true,
              responses: {
                include: {
                  question: true,
                },
              },
            },
          });
          console.log('✅ Application type updated successfully');
          return updated;
        }
        
        console.log('ℹ️ Application type already matches, returning existing application');
        return existing;
      }

      // Create new application with race condition handling
      console.log('🆕 Creating new application');
      try {
        const application = await ctx.db.application.create({
          data: {
            userId: ctx.session.user.id,
            eventId: input.eventId,
            email: ctx.session.user.email!,
            language: input.language,
            applicationType: input.applicationType,
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

        console.log('✅ New application created successfully with type:', application.applicationType);
        return application;
      } catch (error: unknown) {
        console.log('⚠️ Error creating application, checking for race condition:', error);
        
        // Handle race condition where application was created between our check and create attempt
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') { // Unique constraint error
          console.log('🏃 Race condition detected, fetching existing application');
          const existingAfterRace = await ctx.db.application.findFirst({
            where: {
              userId: ctx.session.user.id,
              eventId: input.eventId,
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
          
          if (existingAfterRace) {
            console.log('📋 Found application after race condition:', {
              id: existingAfterRace.id,
              currentType: existingAfterRace.applicationType,
              requestedType: input.applicationType
            });

            // Update the application type if different
            if (existingAfterRace.applicationType !== input.applicationType) {
              console.log('🔄 Updating application type after race condition from', existingAfterRace.applicationType, 'to', input.applicationType);
              const updated = await ctx.db.application.update({
                where: { id: existingAfterRace.id },
                data: { applicationType: input.applicationType },
                include: {
                  event: true,
                  responses: {
                    include: {
                      question: true,
                    },
                  },
                },
              });
              console.log('✅ Application type updated successfully after race condition');
              return updated;
            }
            return existingAfterRace;
          }
        }
        
        // Re-throw if it's not a race condition we can handle
        console.log('❌ Unhandled error in createApplication:', error);
        throw error;
      }
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
      // Verify the application exists and user has access (owner or admin/staff)
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      // Allow access if user owns the application OR user is admin/staff
      const isOwner = application.userId === ctx.session.user.id;
      const isAdmin = ctx.session.user.role === "admin" || ctx.session.user.role === "staff";
      
      if (!isOwner && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied - you can only edit your own applications",
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
        // For auto-save updates, don't treat as intentional edits to prevent aggressive reversion
        const updateResult = await updateApplicationCompletionStatus(ctx.db, input.applicationId, completionResult, {
          isUserIntentionalEdit: false // This is an auto-save update, not an intentional edit
        });
        
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
        captureApiError(error, {
          userId: ctx.session.user.id,
          route: "application.updateResponse",
          method: "POST",
          input: { applicationId: input.applicationId, questionId: input.questionId }
        });
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

      // Check required questions are answered (excluding conditional fields)
      const allRequiredQuestions = await ctx.db.applicationQuestion.findMany({
        where: {
          eventId: application.eventId,
          required: true,
        },
      });

      // Filter out conditional fields that shouldn't be required
      const requiredQuestions = allRequiredQuestions.filter(question => {
        const questionText = question.questionEn.toLowerCase();
        const isConditionalField = questionText.includes("specify") || 
                                   questionText.includes("if you answered") ||
                                   questionText.includes("if you did not select") ||
                                   questionText.includes("other") && questionText.includes("please");
        return !isConditionalField;
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
        captureEmailError(error, {
          userId: ctx.session.user.id,
          emailType: "application_submission",
          templateName: "applicationSubmitted"
        });
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
      status: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED", "CANCELLED"]).optional(),
      applicationType: z.enum(["RESIDENT", "MENTOR"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const applications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          ...(input.status && { status: input.status }),
          ...(input.applicationType && { applicationType: input.applicationType }),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              email: true,
              adminNotes: true,
              adminWorkExperience: true,
              adminLabels: true,
              adminUpdatedAt: true,
              profile: true,
            },
          },
          responses: {
            include: {
              question: true,
            },
          },
          reviewerAssignments: {
            include: {
              reviewer: {
                select: {
                  id: true,
                  firstName: true,
                  surname: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            orderBy: {
              assignedAt: 'desc',
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return applications;
    }),

  // Admin: Get consensus applications (applications with evaluations and scores)
  getConsensusApplications: protectedProcedure
    .input(z.object({ 
      eventId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const applications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          evaluations: {
            some: {
              overallScore: {
                not: null,
              },
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              email: true,
              adminNotes: true,
              adminWorkExperience: true,
              adminLabels: true,
              adminUpdatedAt: true,
              profile: true,
            },
          },
          responses: {
            include: {
              question: true,
            },
          },
          reviewerAssignments: {
            include: {
              reviewer: {
                select: {
                  id: true,
                  firstName: true,
                  surname: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            orderBy: {
              assignedAt: 'desc',
            },
          },
          evaluations: {
            where: {
              overallScore: {
                not: null,
              },
            },
            select: {
              id: true,
              overallScore: true,
              overallComments: true,
              completedAt: true,
              recommendation: true,
              reviewer: {
                select: {
                  id: true,
                  firstName: true,
                  surname: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            orderBy: {
              completedAt: 'desc',
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Calculate average scores and sort by average (highest first)
      const applicationsWithScores = applications.map(app => {
        const validEvaluations = app.evaluations.filter(evaluation => evaluation.overallScore !== null);
        const averageScore = validEvaluations.length > 0 
          ? validEvaluations.reduce((sum, evaluation) => sum + evaluation.overallScore!, 0) / validEvaluations.length
          : 0;
        
        return {
          ...app,
          averageScore,
          evaluationCount: validEvaluations.length,
        };
      });

      // Sort by average score (highest first)
      applicationsWithScores.sort((a, b) => b.averageScore - a.averageScore);

      return applicationsWithScores;
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
              firstName: true,
              surname: true,
              name: true,
              email: true,
              adminNotes: true,
              adminWorkExperience: true,
              adminLabels: true,
              adminUpdatedAt: true,
              profile: true,
            },
          },
          event: true,
        },
      });

      // Send notification email when status changes to accepted, rejected, or waitlisted
      if (['ACCEPTED', 'REJECTED', 'WAITLISTED'].includes(input.status)) {
        try {
          const { getEmailService } = await import('~/server/email/emailService');
          const emailService = getEmailService(ctx.db);
          
          const result = await emailService.sendApplicationStatusEmail(
            application,
            input.status as 'ACCEPTED' | 'REJECTED' | 'WAITLISTED'
          );
          
          if (result.success) {
            console.log(`Status change email sent for application ${input.applicationId} (${input.status})`);
          } else {
            console.error(`Failed to send status change email: ${result.error}`);
          }
        } catch (error) {
          console.error('Error sending status change email:', error);
          captureEmailError(error, {
            userId: application.userId ?? undefined,
            emailType: "status_change",
            templateName: `application${input.status.toLowerCase().charAt(0).toUpperCase() + input.status.toLowerCase().slice(1)}`
          });
          // Don't fail the status update if email fails
        }
      }

      // Auto-sync profile data when application is accepted
      if (input.status === 'ACCEPTED' && application.userId) {
        try {
          // Check if this application has already been synced
          const existingSync = await ctx.db.profileSync.findUnique({
            where: {
              userId_applicationId: {
                userId: application.userId,
                applicationId: input.applicationId,
              },
            },
          });

          if (!existingSync) {
            // Get application with responses for sync
            const appWithResponses = await ctx.db.application.findUnique({
              where: { id: input.applicationId },
              include: {
                responses: {
                  include: {
                    question: {
                      select: {
                        questionKey: true,
                      },
                    },
                  },
                },
              },
            });

            if (appWithResponses) {
              // Get or create profile
              let profile = await ctx.db.userProfile.findUnique({
                where: { userId: application.userId },
              });

              profile ??= await ctx.db.userProfile.create({
                data: { userId: application.userId },
              });
              // Map responses
              const responseMap = new Map(
                appWithResponses.responses.map(r => [r.question.questionKey, r.answer])
              );

              const updateData: Partial<{
                bio: string;
                location: string;
                company: string;
                linkedinUrl: string;
                githubUrl: string;
                skills: string[];
              }> = {};

              const syncedFields: string[] = [];

              // Sync skills (merge with existing)
              if (responseMap.has("technical_skills")) {
                try {
                  const appSkills = JSON.parse(responseMap.get("technical_skills")!) as string[];
                  const existingSkills = profile.skills ?? [];
                  const mergedSkills = Array.from(new Set([...existingSkills, ...appSkills]));
                  updateData.skills = mergedSkills;
                  syncedFields.push('skills');
                } catch {
                  // Skip if parsing fails
                }
              }

              // Sync other fields (only if profile field is empty)
              if (responseMap.has("bio") && !profile.bio) {
                const appBio = responseMap.get("bio")!;
                if (appBio.trim()) {
                  updateData.bio = appBio.trim();
                  syncedFields.push('bio');
                }
              }

              if (responseMap.has("location") && !profile.location) {
                const appLocation = responseMap.get("location")!;
                if (appLocation.trim()) {
                  updateData.location = appLocation.trim();
                  syncedFields.push('location');
                }
              }

              if (responseMap.has("company") && !profile.company) {
                const appCompany = responseMap.get("company")!;
                if (appCompany.trim()) {
                  updateData.company = appCompany.trim();
                  syncedFields.push('company');
                }
              }

              if (responseMap.has("linkedin_url") && !profile.linkedinUrl) {
                const appLinkedIn = responseMap.get("linkedin_url")!;
                if (appLinkedIn.trim()) {
                  updateData.linkedinUrl = appLinkedIn.trim();
                  syncedFields.push('linkedinUrl');
                }
              }

              if (responseMap.has("github_url") && !profile.githubUrl) {
                const appGitHub = responseMap.get("github_url")!;
                if (appGitHub.trim()) {
                  updateData.githubUrl = appGitHub.trim();
                  syncedFields.push('githubUrl');
                }
              }

              // Update profile if there are changes
              if (Object.keys(updateData).length > 0) {
                await ctx.db.userProfile.update({
                  where: { id: profile.id },
                  data: updateData,
                });
              }

              // Record the sync
              await ctx.db.profileSync.create({
                data: {
                  userId: application.userId,
                  applicationId: input.applicationId,
                  syncedFields,
                },
              });

              console.log(`Auto-synced ${syncedFields.length} fields to profile for application ${input.applicationId}`);
            }
          }
        } catch (error) {
          console.error('Error auto-syncing profile:', error);
          captureApiError(error, {
            userId: application.userId,
            route: "application.updateStatus.profileSync",
            method: "POST",
            input: { applicationId: input.applicationId, status: input.status }
          });
          // Don't fail the status update if profile sync fails
        }
      }

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

      // Send notification emails for status changes
      if (['ACCEPTED', 'REJECTED', 'WAITLISTED'].includes(input.status)) {
        try {
          const { getEmailService } = await import('~/server/email/emailService');
          const emailService = getEmailService(ctx.db);
          
          // Fetch full application data for emails
          const fullApplications = await ctx.db.application.findMany({
            where: {
              id: {
                in: input.applicationIds,
              },
            },
            include: {
              user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              email: true,
              adminNotes: true,
              adminWorkExperience: true,
              adminLabels: true,
              adminUpdatedAt: true,
              profile: true,
            },
          },
              event: true,
            },
          });

          // Send emails in parallel
          const emailPromises = fullApplications.map(app => 
            emailService.sendApplicationStatusEmail(
              app,
              input.status as 'ACCEPTED' | 'REJECTED' | 'WAITLISTED'
            ).catch(error => {
              console.error(`Failed to send email for application ${app.id}:`, error);
              return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            })
          );

          const results = await Promise.allSettled(emailPromises);
          const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
          
          console.log(`Bulk status emails: ${successCount}/${fullApplications.length} sent successfully`);
        } catch (error) {
          console.error('Error sending bulk status change emails:', error);
          captureEmailError(error, {
            emailType: "bulk_status_change",
            templateName: `application${input.status.toLowerCase().charAt(0).toUpperCase() + input.status.toLowerCase().slice(1)}`,
            recipient: `${input.applicationIds.length} applications`
          });
          // Don't fail the status update if emails fail
        }
      }

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
              firstName: true,
              surname: true,
              name: true,
              email: true,
              adminNotes: true,
              adminWorkExperience: true,
              adminLabels: true,
              adminUpdatedAt: true,
              profile: true,
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

  // Admin: Update application affiliation
  updateApplicationAffiliation: protectedProcedure
    .input(z.object({
      applicationId: z.string(),
      affiliation: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Update the application's affiliation field directly
      const application = await ctx.db.application.update({
        where: { id: input.applicationId },
        data: { affiliation: input.affiliation },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              email: true,
              adminNotes: true,
              adminWorkExperience: true,
              adminLabels: true,
              adminUpdatedAt: true,
              profile: true,
            },
          },
          responses: {
            include: {
              question: true,
            },
          },
        },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      return application;
    }),

  // Bulk update application responses
  bulkUpdateApplicationResponses: protectedProcedure
    .input(BulkUpdateApplicationResponsesSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the application exists and user has access (owner or admin/staff)
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      // Allow access if user owns the application OR user is admin/staff
      const isOwner = application.userId === ctx.session.user.id;
      const isAdmin = ctx.session.user.role === "admin" || ctx.session.user.role === "staff";
      
      if (!isOwner && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied - you can only edit your own applications",
        });
      }

      // Use transaction to update all responses atomically
      const updatedResponses = await ctx.db.$transaction(
        input.responses.map(response => 
          ctx.db.applicationResponse.upsert({
            where: {
              applicationId_questionId: {
                applicationId: input.applicationId,
                questionId: response.questionId,
              },
            },
            update: {
              answer: response.answer,
            },
            create: {
              applicationId: input.applicationId,
              questionId: response.questionId,
              answer: response.answer,
            },
            include: {
              question: true,
            },
          })
        )
      );

      // Auto-check and update completion status
      const completionResult = await checkApplicationCompleteness(ctx.db, input.applicationId);
      await updateApplicationCompletionStatus(ctx.db, input.applicationId, completionResult, {
        isUserIntentionalEdit: true // This is a bulk save, treat as intentional edit
      });

      return {
        success: true,
        updatedCount: updatedResponses.length,
        responses: updatedResponses,
      };
    }),

  // Admin: Get application statistics for demographics
  getApplicationStats: protectedProcedure
    .input(z.object({ 
      eventId: z.string(),
      status: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED", "CANCELLED"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Import demographics utilities
      const { isLatamCountry, normalizeGender, calculatePercentage } = await import("~/utils/demographics");

      // Get applications with their responses, filtering by status if provided
      const applications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          ...(input.status && { status: input.status }),
        },
        include: {
          responses: {
            include: {
              question: {
                select: {
                  id: true,
                  questionKey: true,
                },
              },
            },
          },
        },
      });

      // Process demographic data
      let maleCount = 0;
      let femaleCount = 0;
      let otherGenderCount = 0;
      let preferNotToSayCount = 0;
      let unspecifiedGenderCount = 0;

      let latamCount = 0;
      let nonLatamCount = 0;
      let unspecifiedRegionCount = 0;

      for (const application of applications) {
        const responseMap = new Map(
          application.responses.map(r => [r.question.questionKey, r.answer])
        );

        // Process gender data
        const genderResponse = responseMap.get('gender') ?? responseMap.get('sex') ?? '';
        const normalizedGender = normalizeGender(genderResponse);
        
        switch (normalizedGender) {
          case 'male':
            maleCount++;
            break;
          case 'female':
            femaleCount++;
            break;
          case 'other':
            otherGenderCount++;
            break;
          case 'prefer_not_to_say':
            preferNotToSayCount++;
            break;
          case 'unspecified':
            unspecifiedGenderCount++;
            break;
        }

        // Process nationality/region data
        const nationalityResponse = responseMap.get('nationality') ?? responseMap.get('country') ?? '';
        
        if (!nationalityResponse) {
          unspecifiedRegionCount++;
        } else if (isLatamCountry(nationalityResponse)) {
          latamCount++;
        } else {
          nonLatamCount++;
        }
      }

      const total = applications.length;

      return {
        total,
        gender: {
          male: maleCount,
          female: femaleCount,
          other: otherGenderCount,
          prefer_not_to_say: preferNotToSayCount,
          unspecified: unspecifiedGenderCount,
          percentages: {
            male: calculatePercentage(maleCount, total),
            female: calculatePercentage(femaleCount, total),
            other: calculatePercentage(otherGenderCount, total),
            prefer_not_to_say: calculatePercentage(preferNotToSayCount, total),
            unspecified: calculatePercentage(unspecifiedGenderCount, total),
          },
        },
        region: {
          latam: latamCount,
          non_latam: nonLatamCount,
          unspecified: unspecifiedRegionCount,
          percentages: {
            latam: calculatePercentage(latamCount, total),
            non_latam: calculatePercentage(nonLatamCount, total),
            unspecified: calculatePercentage(unspecifiedRegionCount, total),
          },
        },
      };
    }),

  // Create sponsored application (admin-only)
  createSponsoredApplication: protectedProcedure
    .input(CreateSponsoredApplicationSchema)
    .mutation(async ({ ctx, input }) => {
      // Check admin access
      checkAdminAccess(ctx.session.user.role);

      // Check if application already exists for this email and event
      const existingApplication = await ctx.db.application.findFirst({
        where: {
          email: input.email,
          eventId: input.eventId,
        },
      });

      if (existingApplication) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An application already exists for this email address and event",
        });
      }

      // Create sponsored application with ACCEPTED status
      const application = await ctx.db.application.create({
        data: {
          eventId: input.eventId,
          email: input.email,
          status: "ACCEPTED",
          language: "en",
          affiliation: input.organization ?? null,
          isComplete: true,
          completedAt: new Date(),
          submittedAt: new Date(),
          // Note: userId is null for sponsored applications
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

      // Create basic response entries for name, organization, and notes if provided
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        include: {
          applicationQuestions: {
            where: {
              questionKey: {
                in: ["name", "full_name", "organization", "notes", "internal_notes"]
              }
            }
          }
        }
      });

      if (event?.applicationQuestions) {
        const responsesToCreate = [];
        
        // Find and populate name field
        const nameQuestion = event.applicationQuestions.find((q) => 
          q.questionKey === "name" || q.questionKey === "full_name"
        );
        if (nameQuestion) {
          responsesToCreate.push({
            applicationId: application.id,
            questionId: nameQuestion.id,
            answer: input.name,
          });
        }

        // Find and populate organization field
        if (input.organization) {
          const orgQuestion = event.applicationQuestions.find((q) => q.questionKey === "organization");
          if (orgQuestion) {
            responsesToCreate.push({
              applicationId: application.id,
              questionId: orgQuestion.id,
              answer: input.organization,
            });
          }
        }

        // Find and populate notes field
        if (input.notes) {
          const notesQuestion = event.applicationQuestions.find((q) => 
            q.questionKey === "notes" || q.questionKey === "internal_notes"
          );
          if (notesQuestion) {
            responsesToCreate.push({
              applicationId: application.id,
              questionId: notesQuestion.id,
              answer: input.notes,
            });
          }
        }

        // Create all responses
        if (responsesToCreate.length > 0) {
          await ctx.db.applicationResponse.createMany({
            data: responsesToCreate,
          });
        }
      }

      return application;
    }),

  // Admin: Update waitlist order for manual ranking
  updateWaitlistOrder: protectedProcedure
    .input(UpdateWaitlistOrderSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // If position is provided, adjust other applications first
      if (input.position !== undefined && input.position !== null) {
        // Get the application's event to scope the reordering
        const application = await ctx.db.application.findUnique({
          where: { id: input.applicationId },
          select: { eventId: true, waitlistOrder: true }
        });

        if (!application) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Application not found",
          });
        }

        // Shift other applications down if they have the same or higher position
        await ctx.db.application.updateMany({
          where: {
            eventId: application.eventId,
            waitlistOrder: { gte: input.position },
            id: { not: input.applicationId } // Don't update the current application
          },
          data: {
            waitlistOrder: { increment: 1 }
          }
        });

        // Update the current application
        const updatedApplication = await ctx.db.application.update({
          where: { id: input.applicationId },
          data: { waitlistOrder: input.position }
        });

        return updatedApplication;
      } else {
        // Clear manual override - set waitlistOrder to null
        const updatedApplication = await ctx.db.application.update({
          where: { id: input.applicationId },
          data: { waitlistOrder: null }
        });

        return updatedApplication;
      }
    }),

  // Get accepted residents for an event
  getAcceptedResidents: publicProcedure
    .input(z.object({ 
      eventId: z.string(),
      minProfileCompletion: z.number().min(0).max(100).optional().default(70),
    }))
    .query(async ({ ctx, input }) => {
      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          status: "ACCEPTED",
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
              profile: {
                select: {
                  id: true,
                  bio: true,
                  jobTitle: true,
                  company: true,
                  location: true,
                  skills: true,
                  githubUrl: true,
                  linkedinUrl: true,
                  website: true,
                  avatarUrl: true,
                  projects: {
                    where: { featured: true },
                    take: 3,
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
          },
        },
      });

      // Filter residents by profile completion percentage
      const residentsWithCompletion = acceptedApplications
        .map(app => {
          const user = app.user;
          const profile = user?.profile;
          
          // Calculate profile completion
          const fields = {
            name: !!user?.name,
            image: !!user?.image,
            bio: !!profile?.bio,
            jobTitle: !!profile?.jobTitle,
            company: !!profile?.company,
            location: !!profile?.location,
            skills: !!profile?.skills && profile.skills.length > 0,
            githubUrl: !!profile?.githubUrl,
            linkedinUrl: !!profile?.linkedinUrl,
            website: !!profile?.website,
          };

          const completedFields = Object.values(fields).filter(Boolean).length;
          const totalFields = Object.keys(fields).length;
          const percentage = Math.round((completedFields / totalFields) * 100);

          return {
            user,
            completionPercentage: percentage,
            meetsThreshold: percentage >= input.minProfileCompletion,
          };
        })
        .filter(resident => resident.meetsThreshold);

      return {
        residents: residentsWithCompletion,
        totalAccepted: acceptedApplications.length,
        visibleResidents: residentsWithCompletion.length,
        hiddenCount: acceptedApplications.length - residentsWithCompletion.length,
      };
    }),

  // Get featured projects from accepted residents
  getResidentProjects: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          status: "ACCEPTED",
        },
        include: {
          user: {
            include: {
              profile: {
                select: {
                  id: true,
                  bio: true,
                  jobTitle: true,
                  company: true,
                  location: true,
                  skills: true,
                  githubUrl: true,
                  linkedinUrl: true,
                  website: true,
                  avatarUrl: true,
                  projects: {
                    where: { featured: true },
                    orderBy: [
                      { featured: "desc" },
                      { order: "asc" },
                      { updatedAt: "desc" },
                    ],
                    include: {
                      updates: {
                        include: {
                          likes: true,
                        },
                      },
                      likes: {
                        select: {
                          userId: true,
                        },
                      },
                      metrics: {
                        where: {
                          isTracking: true,
                        },
                        select: {
                          id: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const projects = acceptedApplications
        .flatMap(app => {
          const userProfile = app.user?.profile;
          if (!userProfile) return [];
          
          return userProfile.projects.map(project => ({
            ...project,
            profile: {
              ...userProfile,
              user: app.user,
            },
          }));
        });

      return projects;
    }),

  // Public: Get accepted participants for an event  
  getEventParticipants: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const participants = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          status: "ACCEPTED",
          applicationType: "RESIDENT", // Only show residents, not mentors for privacy
        },
        select: {
          id: true,
          submittedAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
              profile: {
                select: {
                  bio: true,
                  jobTitle: true,
                  company: true,
                  location: true,
                  skills: true,
                  interests: true,
                  githubUrl: true,
                  linkedinUrl: true,
                  twitterUrl: true,
                  website: true,
                  priorExperience: true,
                  availableForHiring: true,
                  availableForMentoring: true,
                  availableForOfficeHours: true,
                }
              },
              userSkills: {
                select: {
                  id: true,
                  experienceLevel: true,
                  skill: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                    }
                  }
                },
                orderBy: {
                  experienceLevel: "desc",
                },
                take: 10,
              }
            }
          }
        },
        orderBy: {
          submittedAt: "asc", // Show earlier applicants first
        }
      });

      return participants;
    }),

  // Search event participants with filters
  searchEventParticipants: publicProcedure
    .input(z.object({
      eventId: z.string(),
      search: z.string().optional(),
      skillCategories: z.array(z.string()).optional(),
      availableForHiring: z.boolean().optional(),
      availableForMentoring: z.boolean().optional(),
      availableForOfficeHours: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const {
        eventId,
        search,
        skillCategories,
        availableForHiring,
        availableForMentoring,
        availableForOfficeHours,
      } = input;

      // Build dynamic where conditions
      const andConditions: Prisma.ApplicationWhereInput[] = [
        { eventId },
        { status: "ACCEPTED" },
        { applicationType: "RESIDENT" },
      ];

      // Text search across name, skills, profile fields, and prior experience
      if (search) {
        andConditions.push({
          OR: [
            { user: { name: { contains: search, mode: "insensitive" } } },
            { user: {
              profile: {
                OR: [
                  { bio: { contains: search, mode: "insensitive" } },
                  { jobTitle: { contains: search, mode: "insensitive" } },
                  { company: { contains: search, mode: "insensitive" } },
                  { priorExperience: { contains: search, mode: "insensitive" } },
                ]
              }
            } },
            { user: {
              userSkills: {
                some: {
                  skill: { name: { contains: search, mode: "insensitive" } }
                }
              }
            } },
          ]
        });
      }

      // Skill category filter
      if (skillCategories && skillCategories.length > 0) {
        andConditions.push({
          user: {
            userSkills: {
              some: {
                skill: {
                  category: { in: skillCategories }
                }
              }
            }
          }
        });
      }

      // Availability filters
      if (availableForHiring !== undefined) {
        andConditions.push({
          user: { profile: { availableForHiring } }
        });
      }
      if (availableForMentoring !== undefined) {
        andConditions.push({
          user: { profile: { availableForMentoring } }
        });
      }
      if (availableForOfficeHours !== undefined) {
        andConditions.push({
          user: { profile: { availableForOfficeHours } }
        });
      }

      const participants = await ctx.db.application.findMany({
        where: {
          AND: andConditions,
        },
        select: {
          id: true,
          submittedAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
              profile: {
                select: {
                  bio: true,
                  jobTitle: true,
                  company: true,
                  location: true,
                  skills: true,
                  interests: true,
                  githubUrl: true,
                  linkedinUrl: true,
                  twitterUrl: true,
                  website: true,
                  priorExperience: true,
                  availableForHiring: true,
                  availableForMentoring: true,
                  availableForOfficeHours: true,
                }
              },
              userSkills: {
                select: {
                  id: true,
                  experienceLevel: true,
                  skill: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                    }
                  }
                },
                orderBy: {
                  experienceLevel: "desc",
                },
                take: 10,
              }
            }
          }
        },
        orderBy: {
          submittedAt: "asc",
        }
      });

      return {
        participants,
        totalCount: participants.length,
      };
    }),

  // Admin: Get single application by ID with full details
  getApplicationById: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              email: true,
              adminNotes: true,
              adminWorkExperience: true,
              adminLabels: true,
              adminUpdatedAt: true,
              profile: true,
            },
          },
          event: {
            select: {
              id: true,
              name: true,
              description: true,
              type: true,
              startDate: true,
              endDate: true,
            },
          },
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
          reviewerAssignments: {
            include: {
              reviewer: {
                select: {
                  id: true,
                  firstName: true,
                  surname: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            orderBy: {
              assignedAt: 'desc',
            },
          },
        },
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