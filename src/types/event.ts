export type EventType = 'residency' | 'hackathon' | 'conference';

/**
 * Normalizes a raw event type string (stored as UPPERCASE in DB)
 * to the lowercase EventType used in code comparisons.
 */
export function normalizeEventType(rawType: string | undefined | null): EventType | undefined {
  if (!rawType) return undefined;
  const lower = rawType.toLowerCase();
  if (lower === 'residency' || lower === 'hackathon' || lower === 'conference') return lower;
  return undefined;
}

export interface EventContent {
  name: string;
  shortDescription: string;
  applicationClosedMessage: {
    title: string;
    description: string;
    infoMessage: string;
  };
  branding: {
    colors: {
      primary: string;
      secondary: string;
      gradient: string;
    };
    icon: string;
  };
}