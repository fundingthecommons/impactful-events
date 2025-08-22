import type { PrismaClient } from "@prisma/client";
import { sendEmail } from "~/lib/email";

export interface ApplicationCompletionResult {
  isComplete: boolean;
  wasJustCompleted: boolean;
  missingFields: string[];
  completedFields: number;
  totalFields: number;
  completionPercentage: number;
}

/**
 * Check if an application has all required fields completed
 */
export async function checkApplicationCompleteness(
  db: PrismaClient,
  applicationId: string
): Promise<ApplicationCompletionResult> {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      responses: {
        include: {
          question: true,
        },
      },
    }
  });

  if (!application) {
    throw new Error('Application not found');
  }

  // Get required questions for this event separately
  const requiredQuestions = await db.applicationQuestion.findMany({
    where: {
      eventId: application.eventId,
      required: true,
    },
    orderBy: { order: 'asc' }
  });
  const answeredQuestionIds = new Set(
    application.responses
      .filter(r => r.answer && r.answer.trim() !== '') // Filter out empty responses
      .map(r => r.questionId)
  );

  const isCurrentlyComplete = requiredQuestions.length > 0 && 
    requiredQuestions.every(q => answeredQuestionIds.has(q.id));
  
  const wasJustCompleted = !application.isComplete && isCurrentlyComplete;

  const missingFields = requiredQuestions
    .filter(q => !answeredQuestionIds.has(q.id))
    .map(q => q.questionKey);

  const completedFields = requiredQuestions.length - missingFields.length;
  const totalFields = requiredQuestions.length;
  const completionPercentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

  return {
    isComplete: isCurrentlyComplete,
    wasJustCompleted,
    missingFields,
    completedFields,
    totalFields,
    completionPercentage
  };
}

/**
 * Update application completion status in database
 */
export async function updateApplicationCompletionStatus(
  db: PrismaClient,
  applicationId: string,
  completionResult: ApplicationCompletionResult
): Promise<{ statusReverted: boolean }> {
  // First get the current application to check its status
  const currentApplication = await db.application.findUnique({
    where: { id: applicationId },
    select: { status: true, isComplete: true }
  });

  if (!currentApplication) {
    throw new Error('Application not found');
  }

  const updateData: {
    isComplete: boolean;
    completedAt?: Date;
    lastIncompleteAt?: Date;
    status?: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WAITLISTED";
  } = {
    isComplete: completionResult.isComplete,
  };

  let statusReverted = false;

  // If application is SUBMITTED and user is making changes that affect completion,
  // revert it back to DRAFT so they need to re-submit
  if (currentApplication.status === "SUBMITTED") {
    updateData.status = "DRAFT";
    statusReverted = true;
    console.log(`🔄 Reverting SUBMITTED application ${applicationId} back to DRAFT due to field changes`);
  }

  if (completionResult.wasJustCompleted) {
    updateData.completedAt = new Date();
  } else if (!completionResult.isComplete) {
    updateData.lastIncompleteAt = new Date();
  }

  await db.application.update({
    where: { id: applicationId },
    data: updateData,
  });

  return { statusReverted };
}

/**
 * Send completion notification email
 */
export async function sendCompletionNotification(
  db: PrismaClient,
  applicationId: string
): Promise<void> {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      user: true,
      event: true,
    },
  });

  if (!application?.user) {
    console.warn(`Cannot send completion notification: application ${applicationId} has no associated user`);
    return;
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const applicationUrl = `${baseUrl}/events/${application.eventId}`;

  const emailContent = generateCompletionEmail({
    applicantName: application.user.name ?? application.user.email ?? 'there',
    eventName: application.event.name,
    applicationUrl,
  });

  try {
    await sendEmail({
      to: application.user.email!,
      subject: emailContent.subject,
      htmlContent: emailContent.htmlContent,
      textContent: emailContent.textContent,
    });

    console.log(`Completion notification sent to ${application.user.email!} for application ${applicationId}`);
  } catch (error) {
    console.error(`Failed to send completion notification for application ${applicationId}:`, error);
  }
}

/**
 * Generate completion email content
 */
export function generateCompletionEmail(params: {
  applicantName: string;
  eventName: string;
  applicationUrl: string;
}): { subject: string; htmlContent: string; textContent: string } {
  const { applicantName, eventName, applicationUrl } = params;
  
  const subject = `Application Complete - ${eventName}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <div style="background: linear-gradient(90deg, #10b981, #059669); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Application Complete!</h1>
      </div>
      
      <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
        <p style="margin-bottom: 20px;">Hi ${applicantName},</p>
        
        <p style="margin-bottom: 20px;">Great news! You&rsquo;ve successfully completed all required fields for your <strong>${eventName}</strong> application.</p>
        
        <div style="background: white; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <h3 style="color: #059669; margin-top: 0; margin-bottom: 15px;">What&rsquo;s Next?</h3>
          <ul style="color: #374151; margin-bottom: 0;">
            <li style="margin-bottom: 10px;"><strong>Review:</strong> Double-check your responses for accuracy</li>
            <li style="margin-bottom: 10px;"><strong>Submit:</strong> Formally submit your application when ready</li>
            <li style="margin-bottom: 10px;"><strong>Edit:</strong> You can still make changes until submission</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${applicationUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
            Review & Submit Application
          </a>
        </div>
        
        <p style="margin-bottom: 0;">Questions? We&rsquo;re here to help!</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; margin: 0;">
          You received this email because you completed all required fields for ${eventName}. 
          If you believe this was sent in error, please contact us.
        </p>
      </div>
    </div>
  `;
  
  const textContent = `
Application Complete - ${eventName}

Hi ${applicantName},

Great news! You've successfully completed all required fields for your ${eventName} application.

What's Next?
- Review: Double-check your responses for accuracy
- Submit: Formally submit your application when ready
- Edit: You can still make changes until submission

Review & Submit Application: ${applicationUrl}

Questions? We're here to help!

---
You received this email because you completed all required fields for ${eventName}. 
If you believe this was sent in error, please contact us.
  `;
  
  return { subject, htmlContent, textContent };
}

/**
 * Format field name for display
 */
export function formatFieldName(fieldKey: string): string {
  return fieldKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase());
}