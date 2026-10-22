import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { env } from "~/env";

// SECURITY: constant-time compare for shared secrets. `===` returns at the
// first differing byte, so response timing leaks how long a matching prefix
// is. Lengths are compared up front (timingSafeEqual throws on a mismatch);
// the length of the secret is not what we are protecting.
function secretsMatch(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * Validates an API key for the Mastra AI agent
 * @param request - The incoming request object
 * @returns boolean - true if valid, false if invalid
 */
export function validateMastraApiKey(request: Request | NextRequest): boolean {
  // SECURITY: fail closed. Under SKIP_ENV_VALIDATION (or a deploy with the
  // variable blank) env.MASTRA_API_KEY can be "" and a bare "Bearer " header
  // would have compared equal to it. No configured key means no access.
  const expectedKey = env.MASTRA_API_KEY;
  if (!expectedKey) {
    return false;
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return false;
  }

  const providedKey = authHeader.replace("Bearer ", "");
  return secretsMatch(providedKey, expectedKey);
}

/**
 * Creates a standardized unauthorized response
 */
export function createUnauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Higher-order function to wrap API route handlers with authentication
 */
export function withMastraAuth<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>,
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    if (!validateMastraApiKey(request)) {
      return createUnauthorizedResponse();
    }

    return handler(request, ...args);
  };
}

/**
 * Validates an API key for external transcription ingestion
 */
export function validateTranscriptionApiKey(
  request: Request | NextRequest,
): boolean {
  if (!env.TRANSCRIPTION_API_KEY) {
    throw new Error("TRANSCRIPTION_API_KEY is not set");
  }
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return false;
  // SECURITY: same constant-time compare as the Mastra key above.
  return secretsMatch(apiKey, env.TRANSCRIPTION_API_KEY);
}

/**
 * Higher-order function to wrap API route handlers with transcription API key auth
 */
export function withTranscriptionAuth<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>,
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    if (!validateTranscriptionApiKey(request)) {
      return createUnauthorizedResponse();
    }
    return handler(request, ...args);
  };
}
