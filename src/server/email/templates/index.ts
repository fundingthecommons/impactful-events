import { ApplicationAcceptedTemplate } from './applicationAccepted';
import { ApplicationRejectedTemplate } from './applicationRejected';
import { ApplicationWaitlistedTemplate } from './applicationWaitlisted';
import { ApplicationSubmittedTemplate } from './applicationSubmitted';
import { ApplicationMissingInfoTemplate } from './applicationMissingInfo';
import { InvitationTemplate } from './invitation';
import { PasswordReset } from './passwordReset';
import { UpdateCommentNotificationTemplate } from './updateCommentNotification';
import { ForumCommentNotificationTemplate } from './forumCommentNotification';
import { AskOfferCommentNotificationTemplate } from './askOfferCommentNotification';

// Template registry with all available templates
export const templates = {
  // Application status templates
  applicationAccepted: ApplicationAcceptedTemplate,
  applicationRejected: ApplicationRejectedTemplate,
  applicationWaitlisted: ApplicationWaitlistedTemplate,
  applicationSubmitted: ApplicationSubmittedTemplate,
  applicationMissingInfo: ApplicationMissingInfoTemplate,

  // Invitation templates
  invitation: InvitationTemplate,

  // Authentication templates
  passwordReset: PasswordReset,

  // Project update templates
  updateCommentNotification: UpdateCommentNotificationTemplate,

  // Comment notification templates
  forumCommentNotification: ForumCommentNotificationTemplate,
  askOfferCommentNotification: AskOfferCommentNotificationTemplate,
} as const;

export type TemplateName = keyof typeof templates;

// Map template names to EmailType enum values
export const templateToEmailType = {
  applicationAccepted: 'APPLICATION_ACCEPTED',
  applicationRejected: 'APPLICATION_REJECTED',
  applicationWaitlisted: 'APPLICATION_WAITLISTED',
  applicationSubmitted: 'APPLICATION_SUBMITTED',
  applicationMissingInfo: 'APPLICATION_MISSING_INFO',
  invitation: 'INVITATION_EVENT_ROLE',
  passwordReset: 'PASSWORD_RESET',
  updateCommentNotification: 'UPDATE_COMMENT',
  forumCommentNotification: 'FORUM_COMMENT',
  askOfferCommentNotification: 'ASK_OFFER_COMMENT',
} as const;

// Export individual templates for direct import
export { ApplicationAcceptedTemplate } from './applicationAccepted';
export { ApplicationRejectedTemplate } from './applicationRejected';
export { ApplicationWaitlistedTemplate } from './applicationWaitlisted';
export { ApplicationSubmittedTemplate } from './applicationSubmitted';
export { ApplicationMissingInfoTemplate } from './applicationMissingInfo';
export { InvitationTemplate } from './invitation';
export { PasswordReset } from './passwordReset';
export { UpdateCommentNotificationTemplate } from './updateCommentNotification';
export { ForumCommentNotificationTemplate } from './forumCommentNotification';
export { AskOfferCommentNotificationTemplate } from './askOfferCommentNotification';

// Export prop types
export type { ApplicationAcceptedProps } from './applicationAccepted';
export type { ApplicationRejectedProps } from './applicationRejected';
export type { ApplicationWaitlistedProps } from './applicationWaitlisted';
export type { ApplicationSubmittedProps } from './applicationSubmitted';
export type { ApplicationMissingInfoProps } from './applicationMissingInfo';
export type { InvitationProps } from './invitation';
export type { PasswordResetProps } from './passwordReset';
export type { UpdateCommentNotificationProps } from './updateCommentNotification';
export type { ForumCommentNotificationProps } from './forumCommentNotification';
export type { AskOfferCommentNotificationProps } from './askOfferCommentNotification';