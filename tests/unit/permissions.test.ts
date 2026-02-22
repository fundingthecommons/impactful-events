/**
 * Permission unit tests.
 *
 * Tests permission helper functions in isolation (no database).
 */

import { describe, it, expect } from "vitest";
import {
  hasStaffAccess,
  hasAdminAccess,
  canAccessEvents,
  hasRole,
} from "~/lib/permissions";

// Helper to create a mock session
function mockSession(role?: string) {
  if (!role) return null;
  return {
    user: {
      id: "test-user",
      name: "Test User",
      email: "test@example.com",
      role,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

describe("Permission Helpers", () => {
  // ── Test 1: hasStaffAccess ────────────────────────────────────────────
  describe("hasStaffAccess", () => {
    it("returns true for staff", () => {
      expect(hasStaffAccess(mockSession("staff"))).toBe(true);
    });

    it("returns true for admin", () => {
      expect(hasStaffAccess(mockSession("admin"))).toBe(true);
    });

    it("returns false for regular user", () => {
      expect(hasStaffAccess(mockSession("user"))).toBe(false);
    });

    it("returns false for null session", () => {
      expect(hasStaffAccess(null)).toBe(false);
    });
  });

  // ── Test 2: hasAdminAccess ────────────────────────────────────────────
  describe("hasAdminAccess", () => {
    it("returns true for admin only", () => {
      expect(hasAdminAccess(mockSession("admin"))).toBe(true);
    });

    it("returns false for staff", () => {
      expect(hasAdminAccess(mockSession("staff"))).toBe(false);
    });

    it("returns false for regular user", () => {
      expect(hasAdminAccess(mockSession("user"))).toBe(false);
    });
  });

  // ── Test 3: canAccessEvents ───────────────────────────────────────────
  describe("canAccessEvents", () => {
    it("returns true for staff+", () => {
      expect(canAccessEvents(mockSession("staff"))).toBe(true);
      expect(canAccessEvents(mockSession("admin"))).toBe(true);
    });

    it("returns false for regular user", () => {
      expect(canAccessEvents(mockSession("user"))).toBe(false);
    });
  });

  // ── Test 4: hasRole ───────────────────────────────────────────────────
  describe("hasRole", () => {
    it("matches exact role", () => {
      expect(hasRole(mockSession("admin"), "admin")).toBe(true);
      expect(hasRole(mockSession("staff"), "staff")).toBe(true);
      expect(hasRole(mockSession("user"), "user")).toBe(true);
    });

    it("does not match different roles", () => {
      expect(hasRole(mockSession("user"), "admin")).toBe(false);
      expect(hasRole(mockSession("staff"), "admin")).toBe(false);
    });
  });
});
