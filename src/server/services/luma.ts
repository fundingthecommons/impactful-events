import { env } from "~/env";

const LUMA_BASE_URL = "https://public-api.luma.com";

interface LumaCouponResponse {
  api_id: string;
  code: string;
  remaining_count: number;
  percent_off: number | null;
  cents_off: number | null;
  currency: string | null;
  valid_start_at: string | null;
  valid_end_at: string | null;
}

interface CreateCouponParams {
  eventId: string;
  code: string;
  percentOff: number;
  remainingCount: number;
}

interface CreateCouponResult {
  success: boolean;
  code?: string;
  error?: string;
}

/**
 * Generate a speaker coupon code in the format SPEAKER-{INITIALS}-{RANDOM}
 * e.g. SPEAKER-JDOE-A3F2
 */
export function generateSpeakerCouponCode(
  firstName?: string | null,
  surname?: string | null,
): string {
  const first = (firstName ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  const last = (surname ?? "").toUpperCase().replace(/[^A-Z]/g, "");

  const initials =
    `${first.charAt(0)}${last.slice(0, 3)}`.replace(/^-+|-+$/g, "") || "SPK";

  // Exclude ambiguous characters (O/0/I/1)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `SPEAKER-${initials}-${random}`;
}

export class LumaService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createCoupon(params: CreateCouponParams): Promise<CreateCouponResult> {
    try {
      const response = await fetch(`${LUMA_BASE_URL}/v1/event/create-coupon`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-luma-api-key": this.apiKey,
        },
        body: JSON.stringify({
          event_id: params.eventId,
          code: params.code,
          percent_off: params.percentOff,
          remaining_count: params.remainingCount,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Luma API error ${String(response.status)}: ${errorText}`,
        };
      }

      const data = (await response.json()) as LumaCouponResponse;
      return { success: true, code: data.code ?? params.code };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown Luma API error",
      };
    }
  }
}

/**
 * Get a LumaService instance if the API key is configured, otherwise null.
 */
export function getLumaService(): LumaService | null {
  if (!env.LUMA_API_KEY) {
    return null;
  }
  return new LumaService(env.LUMA_API_KEY);
}
