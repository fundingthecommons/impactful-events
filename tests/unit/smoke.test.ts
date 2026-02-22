/**
 * Unit test smoke test to verify vitest.config.unit.ts works.
 */

import { describe, it, expect } from "vitest";

describe("Unit Test Infrastructure", () => {
  it("runs a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("resolves the ~ alias", async () => {
    // Verify the path alias works for unit tests
    const mod = await import("~/lib/permissions");
    expect(typeof mod.hasStaffAccess).toBe("function");
  });
});
