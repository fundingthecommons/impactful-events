/**
 * Per-test setup for unit tests.
 * Mocks framework dependencies so pure logic can be tested in isolation.
 */

import { vi } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";
(process.env as Record<string, string>).NODE_ENV = "test";

// Mock next-auth so modules that import `type Session` can resolve
vi.mock("next-auth", () => ({
  default: vi.fn(),
}));

// Mock next/server for next-auth internals
vi.mock("next/server", () => ({
  NextResponse: { json: vi.fn(), redirect: vi.fn() },
  NextRequest: vi.fn(),
}));
