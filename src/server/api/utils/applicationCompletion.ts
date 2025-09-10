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
  const allRequiredQuestions = await db.applicationQuestion.findMany({
    where: {
      eventId: application.eventId,
      required: true,
    },
    orderBy: { order: 'asc' }
  });
  
  // Filter out conditional fields that shouldn't be required based on user responses
  const requiredQuestions = allRequiredQuestions.filter(question => {
    // Check for conditional fields using the same logic as the application router
    const questionText = question.questionEn.toLowerCase();
    const isConditionalField = questionText.includes("specify") || 
                               questionText.includes("if you answered") ||
                               questionText.includes("if you did not select") ||
                               questionText.includes("other") && questionText.includes("please");
    
    // If it's not a conditional field, it's always required
    if (!isConditionalField) {
      return true;
    }
    
    // Special handling for technical_skills_other field
    if (question.questionKey === "technical_skills_other") {
      // Only require if "Other" is selected in technical_skills
      const technicalSkillsResponse = application.responses.find(r => 
        r.question.questionKey === "technical_skills" && r.answer?.trim()
      );
      
      if (technicalSkillsResponse) {
        try {
          const selectedSkills: unknown = JSON.parse(technicalSkillsResponse.answer);
          return Array.isArray(selectedSkills) && selectedSkills.includes("Other");
        } catch {
          // If not valid JSON, treat as single value
          return technicalSkillsResponse.answer.includes("Other");
        }
      }
      
      return false; // Don't require if technical_skills is not answered
    }
    
    // For other conditional fields, don't require them (future enhancement could add more logic here)
    return false;
  });
  
  const answeredQuestionIds = new Set(
    application.responses
      .filter(r => {
        if (!r.answer) return false;
        const trimmed = r.answer.trim();
        if (!trimmed) return false;
        
        // For JSON arrays (multiselect fields), check if array has content
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed) as unknown;
            return Array.isArray(parsed) && parsed.length > 0;
          } catch {
            return false;
          }
        }
        
        // For regular text, just check if not empty
        return true;
      })
      .map(r => r.questionId)
  );

  // DEBUG: Enhanced logging for missing field detection
  console.log('🔍 MISSING FIELD DETECTION DEBUG:', {
    applicationId: applicationId,
    totalRequiredQuestions: requiredQuestions.length,
    totalResponses: application.responses.length,
    requiredQuestions: requiredQuestions.map(q => ({
      id: q.id,
      questionKey: q.questionKey,
      questionText: q.questionEn.substring(0, 50) + '...',
      isAnswered: answeredQuestionIds.has(q.id)
    })),
    responses: application.responses.map(r => ({
      questionId: r.questionId,
      questionKey: r.question.questionKey,
      answer: r.answer?.substring(0, 100) + (r.answer?.length > 100 ? '...' : ''),
      answerLength: r.answer?.length,
      passesFilter: r.answer && r.answer.trim() !== ''
    })),
    answeredQuestionIds: Array.from(answeredQuestionIds),
    techSkillsSpecific: {
      techSkillsQuestion: requiredQuestions.find(q => q.questionKey === 'technical_skills'),
      techSkillsResponse: application.responses.find(r => r.question.questionKey === 'technical_skills'),
      techSkillsOtherQuestion: requiredQuestions.find(q => q.questionKey === 'technical_skills_other'),
      techSkillsOtherResponse: application.responses.find(r => r.question.questionKey === 'technical_skills_other')
    }
  });

  const isCurrentlyComplete = requiredQuestions.length > 0 && 
    requiredQuestions.every(q => answeredQuestionIds.has(q.id));
  
  const wasJustCompleted = !application.isComplete && isCurrentlyComplete;

  const missingFields = requiredQuestions
    .filter(q => !answeredQuestionIds.has(q.id))
    .map(q => q.questionKey);

  console.log('🔍 MISSING FIELDS RESULT:', {
    missingFields,
    isCurrentlyComplete,
    wasJustCompleted
  });

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
  completionResult: ApplicationCompletionResult,
  context?: { isUserIntentionalEdit?: boolean }
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

  // Only revert SUBMITTED applications to DRAFT in specific cases:
  // 1. The application becomes incomplete (missing required fields)
  // 2. This is explicitly marked as an intentional user edit (not just auto-save)
  if (currentApplication.status === "SUBMITTED") {
    const shouldRevert = !completionResult.isComplete || context?.isUserIntentionalEdit;
    
    if (shouldRevert) {
      updateData.status = "DRAFT";
      statusReverted = true;
      const reason = !completionResult.isComplete ? "missing required fields" : "intentional field changes";
      console.log(`🔄 Reverting SUBMITTED application ${applicationId} back to DRAFT due to ${reason}`);
    } else {
      console.log(`✅ Keeping SUBMITTED status for application ${applicationId} - no substantial changes detected`);
    }
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
 * Send submission confirmation email (when actually submitted)
 */
export async function sendSubmissionNotification(
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
    console.warn(`Cannot send submission notification: application ${applicationId} has no associated user`);
    return;
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const applicationUrl = `${baseUrl}/events/${application.eventId}`;

  const emailContent = generateSubmissionEmail({
    applicantName: application.user.name ?? application.user.email ?? 'there',
    eventName: application.event.name,
    applicationUrl,
    submittedAt: application.submittedAt ?? new Date(),
  });

  try {
    await sendEmail({
      to: application.user.email!,
      subject: emailContent.subject,
      htmlContent: emailContent.htmlContent,
      textContent: emailContent.textContent,
    });

    console.log(`Submission confirmation email sent to ${application.user.email!} for application ${applicationId}`);
  } catch (error) {
    console.error(`Failed to send submission notification for application ${applicationId}:`, error);
  }
}

/**
 * Generate submission confirmation email content
 */
export function generateSubmissionEmail(params: {
  applicantName: string;
  eventName: string;
  applicationUrl: string;
  submittedAt: Date;
}): { subject: string; htmlContent: string; textContent: string } {
  const { applicantName, eventName, applicationUrl, submittedAt } = params;
  
  const subject = `Application Submitted - ${eventName}`;
  
  const submissionDate = submittedAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <div style="background: linear-gradient(90deg, #2563eb, #1d4ed8); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✅ Application Submitted!</h1>
      </div>
      
      <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
        <p style="margin-bottom: 20px;">Hi ${applicantName},</p>
        
        <p style="margin-bottom: 20px;">Thank you! Your application for <strong>${eventName}</strong> has been successfully submitted and is now under review.</p>
        
        <div style="background: white; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <h3 style="color: #1d4ed8; margin-top: 0; margin-bottom: 15px;">Submission Details</h3>
          <ul style="color: #374151; margin-bottom: 0;">
            <li style="margin-bottom: 10px;"><strong>Submitted:</strong> ${submissionDate}</li>
            <li style="margin-bottom: 10px;"><strong>Status:</strong> Under Review</li>
            <li style="margin-bottom: 10px;"><strong>Reference:</strong> You can track your application using the link below</li>
          </ul>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; padding: 15px; margin: 20px 0;">
          <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px;">What Happens Next?</h4>
          <p style="color: #92400e; margin-bottom: 0; font-size: 14px;">
            Our team will review your application and may contact you if any additional information is needed. 
            We operate on a rolling admissions basis and expect to notify all applicants by <strong>September 14th, 2025</strong>.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${applicationUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
            View Your Application
          </a>
        </div>
        
        <p style="margin-bottom: 0;">Questions? We&rsquo;re here to help!</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; margin: 0;">
          You received this email because you submitted an application for ${eventName}. 
          If you believe this was sent in error, please contact us.
        </p>
      </div>
    </div>
  `;
  
  const textContent = `
Application Submitted - ${eventName}

Hi ${applicantName},

Thank you! Your application for ${eventName} has been successfully submitted and is now under review.

Submission Details:
- Submitted: ${submissionDate}
- Status: Under Review
- Reference: You can track your application using the link below

What Happens Next?
Our team will review your application and may contact you if any additional information is needed. 
We operate on a rolling admissions basis and expect to notify all applicants by September 14th, 2025.

View Your Application: ${applicationUrl}

Questions? We're here to help!

---
You received this email because you submitted an application for ${eventName}. 
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