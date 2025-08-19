import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

import { sendEmail, generateMissingInfoEmail } from "~/lib/email";

// Input schemas
const CreateMissingInfoEmailSchema = z.object({
  applicationId: z.string(),
});

const SendEmailSchema = z.object({
  emailId: z.string(),
});

const GetApplicationEmailsSchema = z.object({
  applicationId: z.string(),
});

const GetEventEmailsSchema = z.object({
  eventId: z.string(),
  status: z.enum(["DRAFT", "QUEUED", "SENT", "FAILED", "CANCELLED"]).optional(),
});

const UpdateEmailSchema = z.object({
  emailId: z.string(),
  subject: z.string().optional(),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),
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

export const emailRouter = createTRPCRouter({
  // Create a draft email for missing application information
  createMissingInfoEmail: protectedProcedure
    .input(CreateMissingInfoEmailSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Get the application with its responses and questions
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          user: true,
          event: true,
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

      // Get all required questions for this event
      const requiredQuestions = await ctx.db.applicationQuestion.findMany({
        where: {
          eventId: application.eventId,
          required: true,
        },
        orderBy: { order: "asc" },
      });

      // Find missing or inadequately answered required questions
      const responseMap = new Map(
        application.responses.map(r => [r.questionId, r])
      );

      const missingQuestions = requiredQuestions.filter(question => {
        const response = responseMap.get(question.id);
        
        // No response at all
        if (!response) {
          return true;
        }
        
        // Empty or whitespace-only answer
        if (!response.answer || response.answer.trim() === "") {
          return true;
        }
        
        // For SELECT/MULTISELECT questions, check if answer is valid
        if (question.questionType === "SELECT" || question.questionType === "MULTISELECT") {
          const answer = response.answer.trim();
          
          // Common invalid select values
          if (answer === "" || 
              answer === "Please select" || 
              answer === "Select an option" ||
              answer === "Choose one" ||
              answer === "null" ||
              answer === "undefined") {
            return true;
          }
          
          // If question has options defined, check if answer is one of them
          if (question.options && question.options.length > 0) {
            const validOptions = question.options.map(opt => opt.toLowerCase().trim());
            const answerLower = answer.toLowerCase().trim();
            
            // For MULTISELECT, check each selected option
            if (question.questionType === "MULTISELECT") {
              const selectedOptions = answer.split(',').map(opt => opt.toLowerCase().trim());
              const hasInvalidOption = selectedOptions.some(opt => !validOptions.includes(opt));
              if (hasInvalidOption || selectedOptions.length === 0) {
                return true;
              }
            } else {
              // For SELECT, check if the answer is one of the valid options
              if (!validOptions.includes(answerLower)) {
                return true;
              }
            }
          }
        }
        
        return false;
      });

      if (missingQuestions.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No missing required fields found",
        });
      }

      // Generate application URL (you'll need to adjust this based on your routing)
      const applicationUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/events/${application.eventId}`;

      // Generate email content
      const emailContent = generateMissingInfoEmail({
        applicantName: application.user?.name ?? "Applicant",
        eventName: application.event.name,
        missingFields: missingQuestions.map(q => q.questionKey),
        applicationUrl,
      });

      // Check if a draft email already exists for this application
      const existingDraft = await ctx.db.email.findFirst({
        where: {
          applicationId: input.applicationId,
          type: "MISSING_INFO",
          status: "DRAFT",
        },
      });

      if (existingDraft) {
        // Update existing draft
        const updatedEmail = await ctx.db.email.update({
          where: { id: existingDraft.id },
          data: {
            subject: emailContent.subject,
            htmlContent: emailContent.htmlContent,
            textContent: emailContent.textContent,
            missingFields: missingQuestions.map(q => q.questionKey),
            updatedAt: new Date(),
          },
        });

        return updatedEmail;
      }

      // Create new draft email
      const email = await ctx.db.email.create({
        data: {
          applicationId: input.applicationId,
          eventId: application.eventId,
          toEmail: application.email,
          subject: emailContent.subject,
          htmlContent: emailContent.htmlContent,
          textContent: emailContent.textContent,
          type: "MISSING_INFO",
          status: "DRAFT",
          missingFields: missingQuestions.map(q => q.questionKey),
          createdBy: ctx.session.user.id,
        },
        include: {
          application: {
            include: {
              user: true,
            },
          },
          event: true,
        },
      });

      return email;
    }),

  // Send a draft email
  sendEmail: protectedProcedure
    .input(SendEmailSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Get the email
      const email = await ctx.db.email.findUnique({
        where: { id: input.emailId },
        include: {
          application: {
            include: {
              user: true,
            },
          },
          event: true,
        },
      });

      if (!email) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email not found",
        });
      }

      if (email.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email is not in draft status",
        });
      }

      // Send the email using Postmark
      const result = await sendEmail({
        to: email.toEmail,
        subject: email.subject,
        htmlContent: email.htmlContent,
        textContent: email.textContent ?? undefined,
      });

      // Update email status based on result
      const updatedEmail = await ctx.db.email.update({
        where: { id: input.emailId },
        data: {
          status: result.success ? "SENT" : "FAILED",
          sentAt: result.success ? new Date() : null,
          postmarkId: result.messageId,
          failureReason: result.error,
          updatedAt: new Date(),
        },
        include: {
          application: {
            include: {
              user: true,
            },
          },
          event: true,
        },
      });

      return {
        email: updatedEmail,
        success: result.success,
        error: result.error,
      };
    }),

  // Get emails for a specific application
  getApplicationEmails: protectedProcedure
    .input(GetApplicationEmailsSchema)
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const emails = await ctx.db.email.findMany({
        where: { applicationId: input.applicationId },
        include: {
          application: {
            include: {
              user: true,
            },
          },
          event: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return emails;
    }),

  // Get emails for a specific event
  getEventEmails: protectedProcedure
    .input(GetEventEmailsSchema)
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const emails = await ctx.db.email.findMany({
        where: {
          eventId: input.eventId,
          ...(input.status && { status: input.status }),
        },
        include: {
          application: {
            include: {
              user: true,
            },
          },
          event: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return emails;
    }),

  // Update a draft email
  updateEmail: protectedProcedure
    .input(UpdateEmailSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Get the email to verify it's a draft
      const email = await ctx.db.email.findUnique({
        where: { id: input.emailId },
      });

      if (!email) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email not found",
        });
      }

      if (email.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft emails can be updated",
        });
      }

      // Update the email
      const updatedEmail = await ctx.db.email.update({
        where: { id: input.emailId },
        data: {
          ...(input.subject && { subject: input.subject }),
          ...(input.htmlContent && { htmlContent: input.htmlContent }),
          ...(input.textContent && { textContent: input.textContent }),
          updatedAt: new Date(),
        },
        include: {
          application: {
            include: {
              user: true,
            },
          },
          event: true,
        },
      });

      return updatedEmail;
    }),

  // Delete a draft email
  deleteEmail: protectedProcedure
    .input(z.object({ emailId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Get the email to verify it's a draft
      const email = await ctx.db.email.findUnique({
        where: { id: input.emailId },
      });

      if (!email) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email not found",
        });
      }

      if (email.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft emails can be deleted",
        });
      }

      // Delete the email
      await ctx.db.email.delete({
        where: { id: input.emailId },
      });

      return { success: true };
    }),

  // Get email statistics for an event
  getEmailStats: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const stats = await ctx.db.email.groupBy({
        by: ["status"],
        where: { eventId: input.eventId },
        _count: {
          id: true,
        },
      });

      const statsMap = stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.id;
        return acc;
      }, {} as Record<string, number>);

      return {
        draft: statsMap.DRAFT ?? 0,
        queued: statsMap.QUEUED ?? 0,
        sent: statsMap.SENT ?? 0,
        failed: statsMap.FAILED ?? 0,
        cancelled: statsMap.CANCELLED ?? 0,
        total: stats.reduce((sum, stat) => sum + stat._count.id, 0),
      };
    }),
});