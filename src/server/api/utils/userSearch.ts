import type { Prisma } from "@prisma/client";

// SECURITY: user.searchUsers is a protectedProcedure, and a session is not a
// trust boundary (anyone can self-register). Ordinary members need name search
// for @mentions and collaborator pickers; only admin/staff and DB-verified
// floor leads may search BY email or SEE email addresses in the results.
// Without this split the endpoint is an email-enumeration oracle over the
// whole user table ("does alice@example.com have an account here?").
export function buildUserSearchWhere(
  query: string,
  canSearchByEmail: boolean,
): Prisma.UserWhereInput {
  const matches: Prisma.UserWhereInput[] = [
    { firstName: { contains: query, mode: "insensitive" } },
    { surname: { contains: query, mode: "insensitive" } },
  ];
  if (canSearchByEmail) {
    matches.push({ email: { contains: query, mode: "insensitive" } });
  }
  return { OR: matches };
}

/** Keep the `email` key (client types unchanged) but null it for non-privileged callers. */
export function redactSearchedUserEmail<T extends { email: string | null }>(
  user: T,
  canSeeEmail: boolean,
): T {
  return canSeeEmail ? user : { ...user, email: null };
}
