import {
  IconCheck,
  IconX,
  IconClock,
  IconAlertTriangle,
  IconUpload,
} from "@tabler/icons-react";
import { createElement, type ReactNode } from "react";

// ──────────────────────────────────────────
// Invitation Status Helpers
// ──────────────────────────────────────────

export function getInvitationStatusColor(status: string): string {
  switch (status) {
    case "PENDING":
      return "blue";
    case "ACCEPTED":
      return "green";
    case "EXPIRED":
      return "orange";
    case "CANCELLED":
      return "red";
    default:
      return "gray";
  }
}

export function getInvitationStatusIcon(status: string): ReactNode {
  switch (status) {
    case "PENDING":
      return createElement(IconClock, { size: 16 });
    case "ACCEPTED":
      return createElement(IconCheck, { size: 16 });
    case "EXPIRED":
      return createElement(IconAlertTriangle, { size: 16 });
    case "CANCELLED":
      return createElement(IconX, { size: 16 });
    default:
      return null;
  }
}

// ──────────────────────────────────────────
// Application Status Helpers
// ──────────────────────────────────────────

export function getApplicationStatusColor(status: string): string {
  switch (status) {
    case "DRAFT":
      return "gray";
    case "SUBMITTED":
      return "blue";
    case "UNDER_REVIEW":
      return "yellow";
    case "ACCEPTED":
      return "green";
    case "REJECTED":
      return "red";
    case "WAITLISTED":
      return "orange";
    default:
      return "gray";
  }
}

export function getApplicationStatusIcon(status: string): ReactNode {
  switch (status) {
    case "DRAFT":
      return createElement(IconClock, { size: 16 });
    case "SUBMITTED":
      return createElement(IconUpload, { size: 16 });
    case "UNDER_REVIEW":
      return createElement(IconClock, { size: 16 });
    case "ACCEPTED":
      return createElement(IconCheck, { size: 16 });
    case "REJECTED":
      return createElement(IconX, { size: 16 });
    case "WAITLISTED":
      return createElement(IconAlertTriangle, { size: 16 });
    default:
      return null;
  }
}

// ──────────────────────────────────────────
// Email Validation
// ──────────────────────────────────────────

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export function validateEmail(email: string): string | null {
  return EMAIL_REGEX.test(email) ? null : "Invalid email";
}

export function parseEmails(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((email) => email.trim())
    .filter(Boolean);
}

export function validateBulkEmails(text: string): string | null {
  if (!text.trim()) return "Emails are required";
  const emails = parseEmails(text);
  const invalidEmails = emails.filter((email) => !EMAIL_REGEX.test(email));
  return invalidEmails.length > 0
    ? `Invalid emails: ${invalidEmails.join(", ")}`
    : null;
}
