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
 * Sessions without a venue can only be managed by admins.
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
    select: { venueId: true },
  });

  if (!session) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
  }

  if (!session.venueId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only admins can manage sessions without a venue assignment",
    });
  }

  const owns = await isVenueOwner(db, userId, session.venueId);
  if (!owns) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to manage sessions in this venue",
    });
  }
}
