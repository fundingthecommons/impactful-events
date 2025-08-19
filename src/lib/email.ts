import { ServerClient } from "postmark";
import { env } from "~/env";

// Create Postmark client
const postmarkClient = new ServerClient(env.POSTMARK_SERVER_TOKEN);

// Production mode check
const IS_PRODUCTION = env.EMAIL_MODE === "production";
const TEST_EMAIL = "james@fundingthecommons.io";

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  messageStream?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Postmark
 * In development: redirects to test email
 * In production: sends to actual recipient (if Postmark account is approved)
 * Sandbox mode: only allows same domain as From address
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const isProductionMode = IS_PRODUCTION;
    
    // Check if recipient domain matches sender domain (for sandbox mode)
    const recipientDomain = params.to.split('@')[1];
    const senderDomain = "fundingthecommons.io";
    const isSameDomain = recipientDomain === senderDomain;
    
    // In production mode, only send to actual recipient if it's same domain or account is approved
    // For now, redirect external domains to test email until Postmark approval
    const shouldRedirect = !isProductionMode || !isSameDomain;
    const finalRecipient = shouldRedirect ? TEST_EMAIL : params.to;
    
    const response = await postmarkClient.sendEmail({
      From: "james@fundingthecommons.io",
      To: finalRecipient,
      Subject: shouldRedirect ? `[${isProductionMode ? 'SANDBOX' : 'DEV'}] ${params.subject} - Original: ${params.to}` : params.subject,
      HtmlBody: shouldRedirect ? `
        <div style="border: 2px solid #${isProductionMode ? 'ffa500' : 'ff6b6b'}; padding: 16px; margin-bottom: 16px; background-color: #${isProductionMode ? 'fff3cd' : 'ffe6e6'}; border-radius: 4px;">
          <strong>⚠️ ${isProductionMode ? 'SANDBOX MODE' : 'DEVELOPMENT MODE'}:</strong> This email was originally intended for <strong>${params.to}</strong> but has been redirected ${isProductionMode ? 'due to Postmark sandbox restrictions' : 'for testing purposes'}.
          ${isProductionMode ? '<br><br>To send to external domains, your Postmark account needs approval.' : ''}
        </div>
        ${params.htmlContent}
      ` : params.htmlContent,
      TextBody: params.textContent ?? (shouldRedirect 
        ? `${isProductionMode ? 'SANDBOX MODE' : 'DEVELOPMENT MODE'}: This email was originally intended for ${params.to} but has been redirected ${isProductionMode ? 'due to Postmark sandbox restrictions' : 'for testing purposes'}.\n\n${stripHtml(params.htmlContent)}`
        : stripHtml(params.htmlContent)
      ),
      MessageStream: params.messageStream ?? "outbound",
    });

    return {
      success: true,
      messageId: response.MessageID,
    };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Simple HTML to text converter for fallback text content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&nbsp;/g, " ") // Replace non-breaking spaces
    .replace(/&amp;/g, "&") // Replace HTML entities
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Generate email content for missing application information
 */
export function generateMissingInfoEmail(params: {
  applicantName: string;
  eventName: string;
  missingFields: string[];
  applicationUrl: string;
}): { subject: string; htmlContent: string; textContent: string } {
  const { applicantName, eventName, missingFields, applicationUrl } = params;
  
  const subject = `Complete Your Application for ${eventName}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
        Complete Your Application
      </h2>
      
      <p>Hi ${applicantName},</p>
      
      <p>Thank you for your interest in <strong>${eventName}</strong>. We've reviewed your application and noticed that some required information is missing.</p>
      
      <div style="background-color: #f8f9fa; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <h3 style="color: #856404; margin-top: 0;">Missing Information:</h3>
        <ul style="margin-bottom: 0;">
          ${missingFields.map(field => `<li><strong>${formatFieldName(field)}</strong></li>`).join("")}
        </ul>
      </div>
      
      <p>To complete your application, please:</p>
      <ol>
        <li>Click the link below to access your application</li>
        <li>Fill in the missing information listed above</li>
        <li>Submit your updated application</li>
      </ol>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${applicationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Complete Application
        </a>
      </div>
      
      <p>If you have any questions or need assistance, please don't hesitate to reach out to us.</p>
      
      <p>Best regards,<br>
      The ${eventName} Team</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        You received this email because you started an application for ${eventName}. 
        If you no longer wish to receive these emails, please contact us.
      </p>
    </div>
  `;
  
  const textContent = `
Complete Your Application for ${eventName}

Hi ${applicantName},

Thank you for your interest in ${eventName}. We've reviewed your application and noticed that some required information is missing.

Missing Information:
${missingFields.map(field => `- ${formatFieldName(field)}`).join("\n")}

To complete your application, please:
1. Visit: ${applicationUrl}
2. Fill in the missing information listed above
3. Submit your updated application

If you have any questions or need assistance, please don't hesitate to reach out to us.

Best regards,
The ${eventName} Team

---
You received this email because you started an application for ${eventName}. 
If you no longer wish to receive these emails, please contact us.
  `;
  
  return { subject, htmlContent, textContent };
}

/**
 * Format field names for display in emails
 */
function formatFieldName(fieldKey: string): string {
  return fieldKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Generate email content for event invitations
 */
export function generateInvitationEmail(params: {
  inviteeName?: string;
  email: string;
  eventName: string;
  eventDescription: string;
  roleName: string;
  inviterName: string;
  signupUrl: string;
  invitationToken: string;
  expiresAt: Date;
}): { subject: string; htmlContent: string; textContent: string } {
  const { 
    inviteeName, 
    email, 
    eventName, 
    eventDescription, 
    roleName, 
    inviterName, 
    signupUrl, 
    invitationToken,
    expiresAt 
  } = params;
  
  const signupWithTokenUrl = `${signupUrl}?invitation=${invitationToken}`;
  const displayName = inviteeName ?? email.split('@')[0];
  const expirationDate = expiresAt.toLocaleDateString();
  
  const subject = `You're Invited: Join ${eventName} as ${roleName}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin-bottom: 10px;">You're Invited!</h1>
        <div style="height: 3px; background: linear-gradient(90deg, #007bff, #28a745); margin: 10px auto; width: 100px;"></div>
      </div>
      
      <p>Hi ${displayName},</p>
      
      <p>${inviterName} has invited you to join <strong>${eventName}</strong> as a <strong style="color: #007bff;">${roleName}</strong>.</p>
      
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">${eventName}</h3>
        <p style="color: #666; margin-bottom: 0;">${eventDescription}</p>
      </div>
      
      <div style="background-color: #e3f2fd; border-left: 4px solid #007bff; padding: 15px; margin: 25px 0;">
        <h4 style="color: #1976d2; margin-top: 0; margin-bottom: 10px;">Your Role: ${roleName}</h4>
        <p style="margin-bottom: 0; color: #555;">You'll have special access and permissions for this event.</p>
      </div>
      
      <p><strong>What's next?</strong></p>
      <ol style="color: #555;">
        <li>Click the button below to create your account or sign in</li>
        <li>Your role will be automatically assigned when you sign up</li>
        <li>You'll get access to ${roleName}-specific features and areas</li>
      </ol>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${signupWithTokenUrl}" 
           style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 16px;">
          Accept Invitation
        </a>
      </div>
      
      <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 12px; margin: 25px 0;">
        <p style="margin: 0; color: #856404; font-size: 14px;">
          <strong>⏰ This invitation expires on ${expirationDate}.</strong> 
          Make sure to accept it before then!
        </p>
      </div>
      
      <p>If you have any questions about this invitation or the event, feel free to reach out to ${inviterName} or our support team.</p>
      
      <p>Looking forward to having you as part of ${eventName}!</p>
      
      <p>Best regards,<br>
      The ${eventName} Team</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        You received this invitation because ${inviterName} thought you'd be a great ${roleName} for ${eventName}. 
        If you believe this was sent in error, please ignore this email.
        <br><br>
        Invitation link: <a href="${signupWithTokenUrl}" style="color: #007bff; text-decoration: none;">${signupWithTokenUrl}</a>
      </p>
    </div>
  `;
  
  const textContent = `
You're Invited: Join ${eventName} as ${roleName}

Hi ${displayName},

${inviterName} has invited you to join ${eventName} as a ${roleName}.

About the Event:
${eventName}
${eventDescription}

Your Role: ${roleName}
You'll have special access and permissions for this event.

What's next?
1. Click the link below to create your account or sign in
2. Your role will be automatically assigned when you sign up
3. You'll get access to ${roleName}-specific features and areas

Accept your invitation:
${signupWithTokenUrl}

⏰ This invitation expires on ${expirationDate}. Make sure to accept it before then!

If you have any questions about this invitation or the event, feel free to reach out to ${inviterName} or our support team.

Looking forward to having you as part of ${eventName}!

Best regards,
The ${eventName} Team

---
You received this invitation because ${inviterName} thought you'd be a great ${roleName} for ${eventName}. 
If you believe this was sent in error, please ignore this email.

Invitation link: ${signupWithTokenUrl}
  `;
  
  return { subject, htmlContent, textContent };
}

/**
 * Generate email content for global admin invitations
 */
export function generateGlobalAdminInvitationEmail(params: {
  inviteeName?: string;
  email: string;
  globalRole: string;
  inviterName: string;
  signupUrl: string;
  invitationToken: string;
  expiresAt: Date;
}): { subject: string; htmlContent: string; textContent: string } {
  const { 
    inviteeName, 
    email, 
    globalRole, 
    inviterName, 
    signupUrl, 
    invitationToken,
    expiresAt 
  } = params;
  
  const signupWithTokenUrl = `${signupUrl}?invitation=${invitationToken}`;
  const displayName = inviteeName ?? email.split('@')[0];
  const expirationDate = expiresAt.toLocaleDateString();
  const roleDisplayName = globalRole === "admin" ? "Administrator" : "Staff Member";
  
  const subject = `Platform Admin Invitation - Join as ${roleDisplayName}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin-bottom: 10px;">🔑 Admin Invitation</h1>
        <div style="height: 3px; background: linear-gradient(90deg, #dc2626, #ea580c); margin: 10px auto; width: 120px;"></div>
      </div>
      
      <p>Hi ${displayName},</p>
      
      <p>${inviterName} has invited you to join <strong>Funding the Commons</strong> as a <strong style="color: #dc2626;">Platform ${roleDisplayName}</strong>.</p>
      
      <div style="background: linear-gradient(135deg, #fef2f2, #fee2e2); border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #991b1b; margin-top: 0; margin-bottom: 15px;">🛡️ ${roleDisplayName} Access</h3>
        <p style="color: #7f1d1d; margin-bottom: 0;">
          ${globalRole === "admin" 
            ? "You'll have full administrative access to the entire platform, including user management, event creation, and system configuration."
            : "You'll have staff-level access to manage events, applications, and user interactions across the platform."
          }
        </p>
      </div>
      
      <p><strong>Your responsibilities will include:</strong></p>
      <ul style="color: #555;">
        ${globalRole === "admin" 
          ? "<li>Managing platform users and permissions</li><li>Creating and configuring events</li><li>Overseeing all platform operations</li><li>System administration and settings</li>"
          : "<li>Managing event applications and participants</li><li>Coordinating with sponsors and mentors</li><li>Supporting event operations</li><li>Assisting with user inquiries</li>"
        }
      </ul>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${signupWithTokenUrl}" 
           style="background: linear-gradient(90deg, #dc2626, #ea580c); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 16px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2);">
          Accept Admin Invitation
        </a>
      </div>
      
      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; padding: 12px; margin: 25px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>⏰ This invitation expires on ${expirationDate}.</strong> 
          Please accept it promptly to gain admin access.
        </p>
      </div>
      
      <p>This is a privileged invitation with administrative responsibilities. If you have any questions about your role or the platform, feel free to reach out to ${inviterName}.</p>
      
      <p>We're excited to have you join our administrative team!</p>
      
      <p>Best regards,<br>
      ${inviterName}<br>
      <em>Funding the Commons Platform</em></p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        You received this administrative invitation because ${inviterName} believes you'd be an excellent ${roleDisplayName} for our platform. 
        This invitation grants privileged access - please keep your account secure.
        <br><br>
        Invitation link: <a href="${signupWithTokenUrl}" style="color: #dc2626; text-decoration: none;">${signupWithTokenUrl}</a>
      </p>
    </div>
  `;
  
  const textContent = `
Platform Admin Invitation - Join as ${roleDisplayName}

Hi ${displayName},

${inviterName} has invited you to join Funding the Commons as a Platform ${roleDisplayName}.

${roleDisplayName} Access:
${globalRole === "admin" 
  ? "You'll have full administrative access to the entire platform, including user management, event creation, and system configuration."
  : "You'll have staff-level access to manage events, applications, and user interactions across the platform."
}

Your responsibilities will include:
${globalRole === "admin" 
  ? "- Managing platform users and permissions\n- Creating and configuring events\n- Overseeing all platform operations\n- System administration and settings"
  : "- Managing event applications and participants\n- Coordinating with sponsors and mentors\n- Supporting event operations\n- Assisting with user inquiries"
}

Accept your admin invitation:
${signupWithTokenUrl}

⏰ This invitation expires on ${expirationDate}. Please accept it promptly to gain admin access.

This is a privileged invitation with administrative responsibilities. If you have any questions about your role or the platform, feel free to reach out to ${inviterName}.

We're excited to have you join our administrative team!

Best regards,
${inviterName}
Funding the Commons Platform

---
You received this administrative invitation because ${inviterName} believes you'd be an excellent ${roleDisplayName} for our platform. 
This invitation grants privileged access - please keep your account secure.

Invitation link: ${signupWithTokenUrl}
  `;
  
  return { subject, htmlContent, textContent };
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(params: {
  email: string;
  eventName: string;
  eventDescription: string;
  roleName: string;
  inviterName: string;
  invitationToken: string;
  expiresAt: Date;
  isGlobalRole?: boolean;
  globalRole?: string;
}): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const signupUrl = `${baseUrl}/register`;
  
  let emailContent;
  
  if (params.isGlobalRole && params.globalRole) {
    emailContent = generateGlobalAdminInvitationEmail({
      ...params,
      globalRole: params.globalRole,
      signupUrl,
    });
  } else {
    emailContent = generateInvitationEmail({
      ...params,
      signupUrl,
    });
  }
  
  return sendEmail({
    to: params.email,
    subject: emailContent.subject,
    htmlContent: emailContent.htmlContent,
    textContent: emailContent.textContent,
  });
}

/**
 * Test email connectivity
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test Email Connection",
      htmlContent: "<p>This is a test email to verify Postmark configuration.</p>",
    });
    return result.success;
  } catch (error) {
    console.error("Email connection test failed:", error);
    return false;
  }
}