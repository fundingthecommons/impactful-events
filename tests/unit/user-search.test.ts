/**
 * Unit tests for the user.searchUsers helpers
 * (src/server/api/utils/userSearch.ts). Pure functions, no database.
 *
 * The procedure itself is protectedProcedure; these helpers enforce that an
 * ordinary member (impostor) can search by name only and never sees email
 * addresses, while admin/staff and floor leads keep the full behaviour.
 */

import { describe, it, expect } from "vitest";
import {
  buildUserSearchWhere,
  redactSearchedUserEmail,
} from "~/server/api/utils/userSearch";

describe("buildUserSearchWhere", () => {
  it("a non-privileged member searches by name only", () => {
    const where = buildUserSearchWhere("ali", false);
    expect(where).toEqual({
      OR: [
        { firstName: { contains: "ali", mode: "insensitive" } },
        { surname: { contains: "ali", mode: "insensitive" } },
      ],
    });
    expect(JSON.stringify(where)).not.toContain("email");
  });

  it("a non-privileged member cannot use the query as an email oracle", () => {
    const where = buildUserSearchWhere("alice@example.com", false);
    expect(JSON.stringify(where)).not.toContain('"email"');
  });

  it("a privileged caller also matches on email", () => {
    const where = buildUserSearchWhere("alice@", true);
    expect(where.OR).toContainEqual({
      email: { contains: "alice@", mode: "insensitive" },
    });
    expect(where.OR).toHaveLength(3);
  });
});

describe("redactSearchedUserEmail", () => {
  const user = {
    id: "u1",
    firstName: "Alice",
    surname: "Doe",
    name: "Alice Doe",
    email: "alice@example.com",
    image: null,
  };

  it("nulls the email for a non-privileged caller and keeps the key", () => {
    const out = redactSearchedUserEmail(user, false);
    expect(out.email).toBeNull();
    expect("email" in out).toBe(true);
    expect(out.firstName).toBe("Alice");
    expect(out.id).toBe("u1");
  });

  it("does not mutate the input", () => {
    redactSearchedUserEmail(user, false);
    expect(user.email).toBe("alice@example.com");
  });

  it("returns the row untouched for a privileged caller", () => {
    expect(redactSearchedUserEmail(user, true)).toBe(user);
  });
});
