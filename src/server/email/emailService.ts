import { render } from '@react-email/render';
import type { PrismaClient, EmailType, EmailStatus, Prisma } from '@prisma/client';
import { sendEmail as sendViaPostmark } from '~/lib/email';
import { templates, type TemplateName, templateToEmailType } from './templates';
import type { 
  ApplicationAcceptedProps,
  ApplicationRejectedProps,
  ApplicationWaitlistedProps,
  ApplicationSubmittedProps,
  ApplicationMissingInfoProps,
  InvitationProps,
} from './templates';

type TemplateProps = 
  | ApplicationAcceptedProps
  | ApplicationRejectedProps
  | ApplicationWaitlistedProps
  | ApplicationSubmittedProps
  | ApplicationMissingInfoProps
  | InvitationProps;

// Strongly typed application data interface
interface ApplicationWithUserAndEvent {
  id: string;
  eventId: string;
  userId?: string | null;
  email: string;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  event: {
    id: string;
    name: string;
    description?: string | null;
    startDate: Date;
    endDate: Date;
    location?: string | null;
  };
}

interface SendEmailParams {
  to: string;
  templateName: TemplateName;
  templateData: TemplateProps;
  applicationId?: string;
  eventId: string;
  userId?: string;
}

export class EmailService {
  constructor(private db: PrismaClient) {}

  /**
   * Send an email using a template
   */
  async sendEmail(params: SendEmailParams) {
    const { to, templateName, templateData, applicationId, eventId, userId } = params;

    try {
      // 1. Render the template
      const Template = templates[templateName];
      if (!Template) {
        throw new Error(`Template ${templateName} not found`);
      }

      // @ts-expect-error - React Email component typing
      const html = await render(Template(templateData));
      const subject = this.getSubjectForTemplate(templateName, templateData);
      
      // Simple text version (you could enhance this)
      const text = this.htmlToText(html);

      // 2. Save to database for tracking
      const emailRecord = await this.db.email.create({
        data: {
          toEmail: to,
          subject,
          htmlContent: html,
          textContent: text,
          type: templateToEmailType[templateName] as EmailType,
          status: 'QUEUED',
          applicationId,
          eventId,
          createdBy: userId ?? 'system',
          templateName,
          templateVersion: '1.0.0',
          templateData: templateData as unknown as Prisma.InputJsonValue,
        },
      });

      // 3. Send via Postmark
      const result = await sendViaPostmark({
        to,
        subject,
        htmlContent: html,
        textContent: text,
      });

      // 4. Update status based on result
      await this.db.email.update({
        where: { id: emailRecord.id },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          postmarkId: result.messageId,
          sentAt: result.success ? new Date() : null,
          failureReason: result.error,
        },
      });

      return {
        success: result.success,
        emailId: emailRecord.id,
        error: result.error,
      };
    } catch (error) {
      console.error('Error sending email:', error);
      
      // Try to save the failure to database
      try {
        await this.db.email.create({
          data: {
            toEmail: to,
            subject: 'Failed to render',
            htmlContent: '',
            type: templateToEmailType[templateName] as EmailType,
            status: 'FAILED',
            failureReason: error instanceof Error ? error.message : 'Unknown error',
            applicationId,
            eventId,
            createdBy: userId ?? 'system',
            templateName,
            templateData: templateData as unknown as Prisma.InputJsonValue,
          },
        });
      } catch (dbError) {
        console.error('Failed to save email error to database:', dbError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send application status change email
   */
  async sendApplicationStatusEmail(
    application: ApplicationWithUserAndEvent,
    status: 'ACCEPTED' | 'REJECTED' | 'WAITLISTED' | 'UNDER_REVIEW'
  ) {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const dashboardUrl = `${baseUrl}/events/${application.eventId}`;
    
    let templateName: TemplateName;
    let templateData: TemplateProps;

    const applicantName = application.user?.name ?? application.user?.email ?? 'Applicant';
    const applicantEmail = application.user?.email ?? application.email;

    switch (status) {
      case 'ACCEPTED':
        templateName = 'applicationAccepted';
        templateData = {
          applicantName,
          eventName: application.event.name,
          programDates: 'February 10-28, 2025', // You'd fetch this from event
          location: 'Buenos Aires, Argentina',
          _stipend: '$2,000 USD',
          _nextStepsUrl: dashboardUrl,
          confirmationDeadline: 'August 7th, 2025',
        } satisfies ApplicationAcceptedProps;
        break;

      case 'REJECTED':
        templateName = 'applicationRejected';
        templateData = {
          applicantName,
          eventName: application.event.name,
          futureOpportunitiesUrl: `${baseUrl}/events`,
          feedbackAvailable: true,
        } satisfies ApplicationRejectedProps;
        break;

      case 'WAITLISTED':
        templateName = 'applicationWaitlisted';
        templateData = {
          applicantName,
          eventName: application.event.name,
          notificationDate: 'January 25, 2025',
          dashboardUrl,
        } satisfies ApplicationWaitlistedProps;
        break;

      default:
        return { success: false, error: 'Unsupported status for email' };
    }

    return this.sendEmail({
      to: applicantEmail,
      templateName,
      templateData,
      applicationId: application.id,
      eventId: application.eventId,
      userId: application.userId ?? undefined,
    });
  }

  /**
   * Get subject line for a template
   */
  private getSubjectForTemplate(templateName: TemplateName, data: TemplateProps): string {
    switch (templateName) {
      case 'applicationAccepted':
        return `🎉 Congratulations! You've been accepted to ${(data as ApplicationAcceptedProps).eventName}`;
      case 'applicationRejected':
        return `Update on your ${(data as ApplicationRejectedProps).eventName} application`;
      case 'applicationWaitlisted':
        return `You're on the waitlist for ${(data as ApplicationWaitlistedProps).eventName}`;
      case 'applicationSubmitted':
        return `Application received for ${(data as ApplicationSubmittedProps).eventName}`;
      case 'applicationMissingInfo':
        return `Action required: Complete your ${(data as ApplicationMissingInfoProps).eventName} application`;
      case 'invitation':
        return `You're invited to join ${(data as InvitationProps).eventName}`;
      default:
        return 'Notification from Funding the Commons';
    }
  }

  /**
   * Simple HTML to text converter
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get sent emails with filters
   */
  async getSentEmails(filters?: {
    eventId?: string;
    status?: EmailStatus;
    templateName?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    return this.db.email.findMany({
      where: {
        eventId: filters?.eventId,
        status: filters?.status,
        templateName: filters?.templateName,
        createdAt: {
          gte: filters?.startDate,
          lte: filters?.endDate,
        },
      },
      include: {
        application: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        event: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 100,
    });
  }

  /**
   * Resend a failed email
   */
  async resendEmail(emailId: string) {
    const email = await this.db.email.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      return { success: false, error: 'Email not found' };
    }

    if (!email.templateName || !email.templateData) {
      // Legacy email without template data - send as-is
      const result = await sendViaPostmark({
        to: email.toEmail,
        subject: email.subject,
        htmlContent: email.htmlContent,
        textContent: email.textContent ?? undefined,
      });

      await this.db.email.update({
        where: { id: emailId },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          postmarkId: result.messageId,
          sentAt: result.success ? new Date() : null,
          failureReason: result.error,
        },
      });

      return result;
    }

    // Re-render and send using template
    return this.sendEmail({
      to: email.toEmail,
      templateName: email.templateName as TemplateName,
      templateData: email.templateData as unknown as TemplateProps,
      applicationId: email.applicationId ?? undefined,
      eventId: email.eventId,
      userId: email.createdBy,
    });
  }
}

// Export singleton instance
let emailService: EmailService | null = null;

export function getEmailService(db: PrismaClient): EmailService {
  emailService ??= new EmailService(db);
  return emailService;
}