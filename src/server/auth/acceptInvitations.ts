import { db } from "~/server/db";

interface AcceptedRole {
  eventName: string;
  roleName: string;
}

interface AcceptInvitationsResult {
  accepted: number;
  roles: AcceptedRole[];
}

/**
 * Accept all pending invitations for a given email address.
 * Creates the appropriate role assignments (UserRole, VenueOwner, or global role).
 *
 * Used by:
 * - NextAuth signIn callback (universal, runs for all auth methods)
 * - invitation.accept tRPC procedure (legacy client-side calls)
 * - POST /api/auth/register (credentials sign-up, with or without an existing
 *   account for the email) — so this function is the single owner of the
 *   "global role needs a verified email" rule.
 */
export async function acceptPendingInvitations(
  email: string,
  userId: string,
  opts: { emailVerified?: boolean } = {},
): Promise<AcceptInvitationsResult> {
  // SECURITY: whether we have proof the signing-in user actually controls this
  // email. Credentials registration performs no email verification, so an
  // attacker can register any address; OAuth providers (Google/Discord) and a
  // CLICKED magic link verify it (a magic-link sign-in *request* does not —
  // see the signIn callback). We refuse to grant a global admin/staff role on
  // an unverified email. EVENT_ROLE and VENUE_OWNER invitations below are
  // still accepted without it (product impact on sponsor / floor-lead
  // onboarding; tracked follow-up), so an event-scoped affiliation is only as
  // strong as sign-up email verification.
  const { emailVerified = false } = opts;
  const invitations = await db.invitation.findMany({
    where: {
      email: { equals: email.toLowerCase(), mode: "insensitive" },
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    include: {
      event: true,
      role: true,
    },
  });

  if (invitations.length === 0) {
    return { accepted: 0, roles: [] };
  }

  const acceptedRoles: AcceptedRole[] = [];

  for (const invitation of invitations) {
    if (
      invitation.type === "EVENT_ROLE" &&
      invitation.eventId &&
      invitation.roleId
    ) {
      const existingRole = await db.userRole.findUnique({
        where: {
          userId_eventId_roleId: {
            userId,
            eventId: invitation.eventId,
            roleId: invitation.roleId,
          },
        },
      });

      if (!existingRole) {
        await db.userRole.create({
          data: {
            userId,
            eventId: invitation.eventId,
            roleId: invitation.roleId,
          },
        });

        acceptedRoles.push({
          eventName: invitation.event?.name ?? "Event",
          roleName: invitation.role?.name ?? "Role",
        });
      }
    } else if (
      (invitation.type === "GLOBAL_ADMIN" ||
        invitation.type === "GLOBAL_STAFF") &&
      invitation.globalRole
    ) {
      // SECURITY: never grant a global admin/staff role from an unverified,
      // self-asserted email. Otherwise an attacker who registers an invited
      // address (credentials sign-up does no email verification) is promoted on
      // first sign-in. Leave the invitation PENDING so a verified sign-in
      // (OAuth) or an existing admin can complete the grant deliberately.
      if (!emailVerified) {
        console.warn(
          `[AUTH] Skipped ${invitation.globalRole} grant for an unverified email; invitation ${invitation.id} left pending.`,
        );
        continue;
      }

      await db.user.update({
        where: { id: userId },
        data: { role: invitation.globalRole },
      });

      acceptedRoles.push({
        eventName: "Global Platform",
        roleName: invitation.globalRole,
      });
    } else if (
      invitation.type === "VENUE_OWNER" &&
      invitation.eventId &&
      invitation.venueId
    ) {
      const existingOwnership = await db.venueOwner.findUnique({
        where: {
          userId_venueId: { userId, venueId: invitation.venueId },
        },
      });

      if (!existingOwnership) {
        await db.venueOwner.create({
          data: {
            userId,
            venueId: invitation.venueId,
            eventId: invitation.eventId,
            assignedBy: invitation.invitedBy,
          },
        });
      }

      const venue = await db.scheduleVenue.findUnique({
        where: { id: invitation.venueId },
        select: { name: true },
      });

      acceptedRoles.push({
        eventName: invitation.event?.name ?? "Event",
        roleName: `Floor Lead - ${venue?.name ?? "Venue"}`,
      });
    }

    await db.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });
  }

  return {
    accepted: acceptedRoles.length,
    roles: acceptedRoles,
  };
}
