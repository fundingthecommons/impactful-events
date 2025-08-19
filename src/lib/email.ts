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