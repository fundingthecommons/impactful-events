/**
 * Unit tests for schedule auth helper functions.
 *
 * Tests the permission helpers in src/server/api/utils/scheduleAuth.ts
 * that are used by schedule router procedures.
 */

import { describe, it, expect } from "vitest";
import { isAdminOrStaff } from "~/server/api/utils/scheduleAuth";

describe("Schedule Auth Helpers", () => {
  describe("isAdminOrStaff", () => {
    it("returns true for admin role", () => {
      expect(isAdminOrStaff("admin")).toBe(true);
    });

    it("returns true for staff role", () => {
      expect(isAdminOrStaff("staff")).toBe(true);
    });

    it("returns false for user role", () => {
      expect(isAdminOrStaff("user")).toBe(false);
    });

    it("returns false for null", () => {
      expect(isAdminOrStaff(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isAdminOrStaff(undefined)).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isAdminOrStaff("")).toBe(false);
    });

    it("is case-sensitive", () => {
      expect(isAdminOrStaff("Admin")).toBe(false);
      expect(isAdminOrStaff("ADMIN")).toBe(false);
      expect(isAdminOrStaff("Staff")).toBe(false);
    });
  });
});
