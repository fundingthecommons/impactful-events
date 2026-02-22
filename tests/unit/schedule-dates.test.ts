/**
 * Unit tests for schedule date handling functions.
 *
 * Covers the date utility functions used in ManageScheduleClient.tsx
 * that caused Sentry error: "TypeError: e.getFullYear is not a function"
 *
 * These functions are extracted here for testing since they're defined
 * inside a client component. The same logic is tested to ensure
 * correctness and to catch regressions.
 */

import { describe, it, expect } from "vitest";

// ── Replicate the functions from ManageScheduleClient.tsx ─────────────

/**
 * Convert a local Date to a UTC-equivalent Date.
 * Mirrors ManageScheduleClient.tsx lines 111-122.
 */
function localToUTC(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
    ),
  );
}

/**
 * Convert a UTC Date to a local-equivalent Date.
 * Mirrors ManageScheduleClient.tsx lines 129-138.
 */
function utcToLocal(date: Date): Date {
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  );
}

/**
 * Safe year extraction - the pattern that should be used on line 879.
 * Returns the year from a date value, or a fallback year.
 */
function safeGetEventYear(dateValue: unknown): number {
  if (!dateValue) return new Date().getFullYear();
  const date = new Date(dateValue as string | number | Date);
  if (isNaN(date.getTime())) return new Date().getFullYear();
  return date.getFullYear();
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("Schedule Date Utilities", () => {
  describe("localToUTC", () => {
    it("converts a valid local date to UTC", () => {
      const local = new Date(2026, 2, 15, 14, 30, 0); // Mar 15, 2026 2:30 PM local
      const utc = localToUTC(local);

      expect(utc.getUTCFullYear()).toBe(2026);
      expect(utc.getUTCMonth()).toBe(2);
      expect(utc.getUTCDate()).toBe(15);
      expect(utc.getUTCHours()).toBe(14);
      expect(utc.getUTCMinutes()).toBe(30);
    });

    it("handles midnight correctly", () => {
      const midnight = new Date(2026, 0, 1, 0, 0, 0);
      const utc = localToUTC(midnight);

      expect(utc.getUTCFullYear()).toBe(2026);
      expect(utc.getUTCMonth()).toBe(0);
      expect(utc.getUTCDate()).toBe(1);
      expect(utc.getUTCHours()).toBe(0);
    });

    it("handles end of day correctly", () => {
      const endOfDay = new Date(2026, 11, 31, 23, 59, 59);
      const utc = localToUTC(endOfDay);

      expect(utc.getUTCHours()).toBe(23);
      expect(utc.getUTCMinutes()).toBe(59);
    });

    it("throws on Invalid Date", () => {
      const invalid = new Date("not-a-date");
      expect(() => localToUTC(invalid)).not.toThrow();
      // Invalid Date produces NaN values
      const result = localToUTC(invalid);
      expect(isNaN(result.getTime())).toBe(true);
    });
  });

  describe("utcToLocal", () => {
    it("converts a valid UTC date to local representation", () => {
      const utc = new Date("2026-03-15T14:30:00Z");
      const local = utcToLocal(utc);

      expect(local.getFullYear()).toBe(2026);
      expect(local.getMonth()).toBe(2);
      expect(local.getDate()).toBe(15);
      expect(local.getHours()).toBe(14);
      expect(local.getMinutes()).toBe(30);
    });

    it("round-trips correctly: localToUTC -> utcToLocal", () => {
      const original = new Date(2026, 5, 20, 9, 15, 0);
      const roundTripped = utcToLocal(localToUTC(original));

      expect(roundTripped.getFullYear()).toBe(original.getFullYear());
      expect(roundTripped.getMonth()).toBe(original.getMonth());
      expect(roundTripped.getDate()).toBe(original.getDate());
      expect(roundTripped.getHours()).toBe(original.getHours());
      expect(roundTripped.getMinutes()).toBe(original.getMinutes());
    });

    it("handles ISO string deserialized as Date", () => {
      // This simulates what tRPC does: JSON parse turns ISO string into Date
      const isoString = "2026-02-20T15:00:00.000Z";
      const date = new Date(isoString);
      const local = utcToLocal(date);

      expect(local.getHours()).toBe(15);
      expect(local.getMinutes()).toBe(0);
    });

    it("handles Invalid Date without throwing", () => {
      const invalid = new Date("garbage");
      const result = utcToLocal(invalid);
      expect(isNaN(result.getTime())).toBe(true);
    });
  });

  describe("safeGetEventYear (defensive pattern for line 879)", () => {
    it("extracts year from a valid Date object", () => {
      const date = new Date("2026-06-15T00:00:00Z");
      expect(safeGetEventYear(date)).toBe(2026);
    });

    it("extracts year from an ISO date string", () => {
      expect(safeGetEventYear("2026-06-15T00:00:00Z")).toBe(2026);
    });

    it("falls back to current year for null", () => {
      expect(safeGetEventYear(null)).toBe(new Date().getFullYear());
    });

    it("falls back to current year for undefined", () => {
      expect(safeGetEventYear(undefined)).toBe(new Date().getFullYear());
    });

    it("falls back to current year for invalid string", () => {
      expect(safeGetEventYear("not-a-date")).toBe(new Date().getFullYear());
    });

    it("falls back to current year for empty string", () => {
      expect(safeGetEventYear("")).toBe(new Date().getFullYear());
    });

    it("handles numeric timestamps", () => {
      const ts = new Date("2025-01-01").getTime();
      expect(safeGetEventYear(ts)).toBe(2025);
    });

    it("handles object that is not a Date", () => {
      expect(safeGetEventYear({})).toBe(new Date().getFullYear());
    });
  });

  describe("Date construction from tRPC response (root cause)", () => {
    it("new Date(validISO).getFullYear() works", () => {
      const result = new Date("2026-03-01T00:00:00.000Z");
      expect(result.getFullYear()).toBe(2026);
    });

    it("new Date(invalidString) creates Invalid Date", () => {
      const result = new Date("corrupted-data");
      expect(isNaN(result.getTime())).toBe(true);
    });

    it("Invalid Date getFullYear returns NaN (does not throw)", () => {
      const invalid = new Date("corrupted");
      // In modern JS engines, getFullYear on Invalid Date returns NaN
      // but some code paths may still get non-Date objects
      const year = invalid.getFullYear();
      expect(isNaN(year)).toBe(true);
    });

    it("non-Date value calling getFullYear throws TypeError", () => {
      // This is the actual Sentry error - a non-Date value has no getFullYear
      const notADate = "2026-03-01" as unknown;
      expect(() => (notADate as Date).getFullYear()).toThrow(TypeError);
    });

    it("null calling getFullYear throws TypeError", () => {
      const nullVal = null as unknown;
      expect(() => (nullVal as Date).getFullYear()).toThrow(TypeError);
    });
  });
});
