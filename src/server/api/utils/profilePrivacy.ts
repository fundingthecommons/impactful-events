import type { Prisma } from "@prisma/client";
import { isAdminOrStaff } from "~/server/api/utils/scheduleAuth";

/**
 * Profile privacy helpers, shared by every router that returns UserProfile
 * rows through a publicProcedure (profile.ts, project.ts).
 *
 * Two independent rules live here:
 *
 *  1. Private contact / internal fields are never returned to a caller who is
 *     neither the profile owner nor admin/staff — `stripPrivateProfileFields`.
 *  2. A profile with `isPublic === false` is hidden from everyone except its
 *     owner and admin/staff. Listing procedures exclude it
 *     (`profileVisibilityFilter`, `memberVisibilityFilter`); a single-record
 *     read that must still render the owner (a public project page) reduces
 *     it to the hidden-profile shape — display name + avatar come from User,
 *     every UserProfile field is nulled (`redactProfileFields`).
 *
 * A session is not a trust boundary (anyone can self-register), so "logged in"
 * never counts as privileged here: only the owner and admin/staff do.
 */

/** The subset of the session the privacy checks need. `null` = anonymous. */
export type ProfileViewer =
  | { id?: string | null; role?: string | null }
  | null
  | undefined;

// SECURITY: private contact / internal fields on UserProfile that must never be
// returned to a caller who is neither the profile owner nor admin/staff. The
// public directory procedures (getAllMembers / searchProfiles / getProfile /
// getAllFeaturedProjects / getProjectDetails) use Prisma `include`, which
// returns the whole row, so we strip these explicitly.
export const PRIVATE_PROFILE_FIELDS = [
  "phoneNumber",
  "telegramHandle",
  "telegramChatId",
  "discordHandle",
  "speakerCoHostInfo",
  // Application-derived text synced from the applicant's form answers, and a
  // free-text "preferred contact" — neither is rendered by any public UI.
  "priorExperience",
  "mentorPreferredContact",
] as const;

export function stripPrivateProfileFields<T>(
  profile: T,
  isPrivileged: boolean,
): T {
  if (!profile || isPrivileged) return profile;
  const sanitized = { ...(profile as Record<string, unknown>) };
  for (const field of PRIVATE_PROFILE_FIELDS) {
    if (field in sanitized) sanitized[field] = null;
  }
  return sanitized as T;
}

/** Owner of the profile, or admin/staff. */
export function isProfileOwnerOrPrivileged(
  profileUserId: string | null | undefined,
  viewer: ProfileViewer,
): boolean {
  if (isAdminOrStaff(viewer?.role)) return true;
  return !!viewer?.id && !!profileUserId && viewer.id === profileUserId;
}

/**
 * Whether `viewer` may see this profile at all. A profile is visible unless
 * the owner explicitly hid it (`isPublic === false`), in which case only the
 * owner and admin/staff may see it. A missing isPublic counts as public (the
 * column defaults to true).
 */
export function canViewProfile(
  profile: { userId: string | null | undefined; isPublic?: boolean | null },
  viewer: ProfileViewer,
): boolean {
  if (profile.isPublic !== false) return true;
  return isProfileOwnerOrPrivileged(profile.userId, viewer);
}

/**
 * Prisma filter for UserProfile listings: non-privileged viewers only see
 * public profiles plus their own. Returns undefined for admin/staff (no
 * filter), so the privileged behaviour is unchanged.
 */
export function profileVisibilityFilter(
  viewer: ProfileViewer,
): Prisma.UserProfileWhereInput | undefined {
  if (isAdminOrStaff(viewer?.role)) return undefined;
  const visible: Prisma.UserProfileWhereInput[] = [{ isPublic: true }];
  if (viewer?.id) visible.push({ userId: viewer.id });
  return { OR: visible };
}

/**
 * The same rule lifted to the User model for the member directory, which
 * lists users with or without a profile row. A user without a profile row has
 * nothing to hide (isPublic defaults to true) and stays listed.
 */
export function memberVisibilityFilter(
  viewer: ProfileViewer,
): Prisma.UserWhereInput | undefined {
  if (isAdminOrStaff(viewer?.role)) return undefined;
  const visible: Prisma.UserWhereInput[] = [
    { profile: { is: null } },
    { profile: { isPublic: true } },
  ];
  if (viewer?.id) visible.push({ id: viewer.id });
  return { OR: visible };
}

/**
 * Hidden-profile shape for a hand-built, all-nullable profile snippet: every
 * key kept (so the response shape and client types do not change), every
 * value nulled.
 */
export function redactProfileFields<T extends Record<string, unknown>>(
  profile: T,
): { [K in keyof T]: null } {
  const redacted = {} as { [K in keyof T]: null };
  for (const key of Object.keys(profile) as (keyof T)[]) {
    redacted[key] = null;
  }
  return redacted;
}
