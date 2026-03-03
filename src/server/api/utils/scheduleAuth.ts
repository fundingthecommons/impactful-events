import { type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

/**
 * Check if user has admin or staff global role.
 */
export function isAdminOrStaff(userRole?: string | null): boolean {
  return userRole === "admin" || userRole === "staff";
}

/**
 * Check if user is a venue owner for a specific venue.
 */
export async function isVenueOwner(
  db: PrismaClient,
  userId: string,
  venueId: string,
): Promise<boolean> {
  const ownership = await db.venueOwner.findUnique({
    where: { userId_venueId: { userId, venueId } },
  });
  return !!ownership;
}

/**
 * Check if user is a venue owner for ANY venue in an event.
 */
export async function isEventFloorOwner(
  db: PrismaClient,
  userId: string,
  eventId: string,
): Promise<boolean> {
  const ownership = await db.venueOwner.findFirst({
    where: { userId, eventId },
  });
  return !!ownership;
}

/**
 * Get all venue IDs a user owns for an event.
 */
export async function getUserOwnedVenueIds(
  db: PrismaClient,
  userId: string,
  eventId: string,
): Promise<string[]> {
  const ownerships = await db.venueOwner.findMany({
    where: { userId, eventId },
    select: { venueId: true },
  });
  return ownerships.map((o) => o.venueId);
}

/**
 * Assert user is admin/staff OR a floor lead for the given event.
 * Throws FORBIDDEN if neither.
 */
export async function assertAdminOrEventFloorOwner(
  db: PrismaClient,
  userId: string,
  userRole: string | undefined | null,
  eventId: string,
): Promise<void> {
  if (isAdminOrStaff(userRole)) return;

  const floorOwner = await isEventFloorOwner(db, userId, eventId);
  if (!floorOwner) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin or floor lead access required",
    });
  }
}

/**
 * Assert user can manage a specific venue (admin OR owner of that venue).
 * Throws FORBIDDEN if not authorized.
 */
export async function assertCanManageVenue(
  db: PrismaClient,
  userId: string,
  userRole: string | undefined | null,
  venueId: string,
): Promise<void> {
  if (isAdminOrStaff(userRole)) return;

  const owns = await isVenueOwner(db, userId, venueId);
  if (!owns) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to manage this venue",
    });
  }
}

/**
 * Assert user can manage a session (admin OR owner of the session's venue).
 * For CONFERENCE events, session speakers can also manage their own sessions.
 * Sessions without a venue can only be managed by admins (unless speaker on CONFERENCE).
 * Throws FORBIDDEN if not authorized.
 */
export async function assertCanManageSession(
  db: PrismaClient,
  userId: string,
  userRole: string | undefined | null,
  sessionId: string,
): Promise<void> {
  if (isAdminOrStaff(userRole)) return;

  const session = await db.scheduleSession.findUnique({
    where: { id: sessionId },
    select: {
      venueId: true,
      event: { select: { type: true } },
      sessionSpeakers: { where: { userId }, select: { id: true } },
    },
  });

  if (!session) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
  }

  // Venue owner check
  if (session.venueId) {
    const owns = await isVenueOwner(db, userId, session.venueId);
    if (owns) return;
  }

  // For CONFERENCE events, allow session speakers to manage their sessions
  const isConference = session.event.type?.toUpperCase() === "CONFERENCE";
  if (isConference && session.sessionSpeakers.length > 0) {
    return;
  }

  if (!session.venueId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only admins can manage sessions without a venue assignment",
    });
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have permission to manage sessions in this venue",
  });
}

/**
 * Check if user is a "speaker-only" editor for a session.
 * Returns true if the user passed assertCanManageSession ONLY because they are
 * a session speaker (not admin/staff, not venue owner).
 */
export async function isSessionSpeakerOnly(
  db: PrismaClient,
  userId: string,
  userRole: string | undefined | null,
  sessionId: string,
): Promise<boolean> {
  if (isAdminOrStaff(userRole)) return false;

  const session = await db.scheduleSession.findUnique({
    where: { id: sessionId },
    select: { venueId: true },
  });

  if (session?.venueId) {
    const owns = await isVenueOwner(db, userId, session.venueId);
    if (owns) return false;
  }

  // If we get here and the user has permission, they must be a session speaker
  return true;
}
