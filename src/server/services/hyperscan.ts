import * as Sentry from "@sentry/nextjs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CollectionStat {
  collection: string;
  count: number;
}

interface TimeSeriesEntry {
  date: string;
  count: number;
  cumulative: number;
}

interface CollectionDetail {
  collection: string;
  totalRecords: number;
  uniqueUsers: number;
  data: TimeSeriesEntry[];
}

export interface HyperscanNetworkStats {
  hypercerts: {
    totalRecords: number;
    activities: CollectionDetail;
    contributors: CollectionDetail;
    rights: CollectionDetail;
    evaluations: CollectionDetail;
    measurements: CollectionDetail;
    collections: CollectionDetail;
    collectionBreakdown: CollectionStat[];
  };
  gainforest: {
    totalRecords: number;
    occurrences: CollectionDetail;
    collectionBreakdown: CollectionStat[];
  };
  hyperscan: {
    totalRecords: number;
    likes: CollectionDetail;
    comments: CollectionDetail;
    collectionBreakdown: CollectionStat[];
  };
  certified: {
    totalRecords: number;
    awards: CollectionDetail;
    definitions: CollectionDetail;
    collectionBreakdown: CollectionStat[];
    uniqueRecipients: number;
  };
  fetchedAt: number;
}

export interface HyperscanFeedItem {
  title: string;
  description: string;
  atUri: string;
  authorDid: string;
  createdAt: string;
  type: "activity" | "occurrence";
  workPeriod?: { from: string; to: string };
  contributors?: number;
  // Biodiversity-specific
  taxonomy?: string;
  coordinates?: { lat: number; lng: number };
  location?: string;
  basis?: string;
}

export interface HyperscanProfileCollection {
  name: string;
  namespace: string;
}

export interface HyperscanProfileRecord {
  title: string;
  atUri: string;
}

export interface HyperscanProfile {
  handle: string;
  did: string;
  followers: number;
  following: number;
  hyperscanUrl: string;
  blueskyUrl: string;
  collections: HyperscanProfileCollection[];
  recentRecords: HyperscanProfileRecord[];
}

// ─── Cache ────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const REST_BASE = "https://www.hyperscan.dev";

const CACHE_TTL = {
  stats: 5 * 60 * 1000,    // 5 minutes
  feed: 2 * 60 * 1000,     // 2 minutes
  profile: 5 * 60 * 1000,  // 5 minutes
} as const;

export class HyperscanService {
  private cache = new Map<string, CacheEntry<unknown>>();

  // ── Stats (JSON endpoint) ─────────────────────────────────────────────────

  async getNetworkStats(): Promise<HyperscanNetworkStats> {
    const cached = this.getCached<HyperscanNetworkStats>("stats");
    if (cached) return cached;

    try {
      const response = await fetch(`${REST_BASE}/api/stats`);
      if (!response.ok) {
        throw new Error(`Hyperscan stats API returned ${String(response.status)}`);
      }
      const data = (await response.json()) as HyperscanNetworkStats;
      this.setCache("stats", data, CACHE_TTL.stats);
      return data;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: "hyperscan", operation: "getNetworkStats" },
      });
      throw error;
    }
  }

  // ── Feed (markdown endpoint, parsed) ──────────────────────────────────────

  async getFeed(options?: {
    type?: "activity" | "occurrence" | "contributor";
    limit?: number;
  }): Promise<HyperscanFeedItem[]> {
    const type = options?.type;
    const limit = options?.limit ?? 20;
    const cacheKey = `feed:${type ?? "all"}:${String(limit)}`;

    const cached = this.getCached<HyperscanFeedItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (limit) params.set("limit", String(limit));

      const url = `${REST_BASE}/agents/feed${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Hyperscan feed API returned ${String(response.status)}`);
      }

      const markdown = await response.text();
      const items = this.parseFeedMarkdown(markdown);
      this.setCache(cacheKey, items, CACHE_TTL.feed);
      return items;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: "hyperscan", operation: "getFeed" },
      });
      throw error;
    }
  }

  // ── Profile (markdown endpoint, parsed) ───────────────────────────────────

  async getProfile(handleOrDid: string): Promise<HyperscanProfile> {
    const cacheKey = `profile:${handleOrDid}`;

    const cached = this.getCached<HyperscanProfile>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${REST_BASE}/agents/profile/${encodeURIComponent(handleOrDid)}`
      );
      if (!response.ok) {
        throw new Error(`Hyperscan profile API returned ${String(response.status)}`);
      }

      const markdown = await response.text();
      const profile = this.parseProfileMarkdown(markdown, handleOrDid);
      this.setCache(cacheKey, profile, CACHE_TTL.profile);
      return profile;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: "hyperscan", operation: "getProfile", handleOrDid },
      });
      throw error;
    }
  }

  // ── Markdown Parsers ──────────────────────────────────────────────────────

  private parseFeedMarkdown(markdown: string): HyperscanFeedItem[] {
    const items: HyperscanFeedItem[] = [];
    const sections = markdown.split(/^---$/m);

    for (const section of sections) {
      const titleMatch = /^### (.+)$/m.exec(section);
      if (!titleMatch) continue;

      const title = titleMatch[1]?.trim() ?? "";
      const atUri = this.extractField(section, "AT-URI");
      const authorDid = this.extractField(section, "Author DID");

      if (!atUri || !authorDid) continue;

      // Determine type based on section context
      const isOccurrence =
        section.includes("**Observed:**") ||
        section.includes("**Basis:**") ||
        section.includes("**Taxonomy:**");

      const item: HyperscanFeedItem = {
        title,
        description: this.extractDescription(section),
        atUri,
        authorDid,
        createdAt:
          this.extractField(section, "Created") ??
          this.extractField(section, "Observed") ??
          "",
        type: isOccurrence ? "occurrence" : "activity",
      };

      // Activity-specific fields
      const workPeriod = this.extractField(section, "Work Period");
      if (workPeriod) {
        const [from, to] = workPeriod.split("→").map((s) => s.trim());
        if (from && to) {
          item.workPeriod = { from, to };
        }
      }

      const contributors = this.extractField(section, "Contributors");
      if (contributors) {
        item.contributors = parseInt(contributors, 10);
      }

      // Occurrence-specific fields
      const taxonomy = this.extractField(section, "Taxonomy");
      if (taxonomy) item.taxonomy = taxonomy;

      const coords = this.extractField(section, "Coordinates");
      if (coords) {
        const [lat, lng] = coords.split(",").map((s) => parseFloat(s.trim()));
        if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
          item.coordinates = { lat, lng };
        }
      }

      const location = this.extractField(section, "Location");
      if (location) item.location = location;

      const basis = this.extractField(section, "Basis");
      if (basis) item.basis = basis;

      items.push(item);
    }

    return items;
  }

  private parseProfileMarkdown(
    markdown: string,
    fallbackDid: string
  ): HyperscanProfile {
    const handleMatch = /^## Identity[\s\S]*?-\s*\*\*Handle:\*\*\s*@?(.+)$/m.exec(markdown);
    const didMatch = /- \*\*DID:\*\*\s*`([^`]+)`/.exec(markdown);
    const followersMatch = /- \*\*Followers:\*\*\s*(\d+)/.exec(markdown);
    const followingMatch = /- \*\*Following:\*\*\s*(\d+)/.exec(markdown);
    const hyperscanUrlMatch = /- \*\*Hyperscan:\*\*\s*(https?:\/\/[^\s]+)/.exec(markdown);
    const blueskyUrlMatch = /- \*\*Bluesky:\*\*\s*(https?:\/\/[^\s]+)/.exec(markdown);

    // Parse collections
    const collections: HyperscanProfileCollection[] = [];
    const collectionMatches = markdown.matchAll(/- `([^`]+)`/g);
    for (const match of collectionMatches) {
      const name = match[1];
      if (name && (name.includes(".") && !name.startsWith("did:"))) {
        const parts = name.split(".");
        collections.push({
          name,
          namespace: parts.slice(0, 2).join("."),
        });
      }
    }

    // Parse recent records
    const recentRecords: HyperscanProfileRecord[] = [];
    const recordMatches = markdown.matchAll(
      /- \*\*([^*]+)\*\*\s*—\s*`(at:\/\/[^`]+)`/g
    );
    for (const match of recordMatches) {
      const title = match[1];
      const atUri = match[2];
      if (title && atUri) {
        recentRecords.push({ title, atUri });
      }
    }

    return {
      handle: handleMatch?.[1]?.trim() ?? fallbackDid,
      did: didMatch?.[1] ?? fallbackDid,
      followers: parseInt(followersMatch?.[1] ?? "0", 10),
      following: parseInt(followingMatch?.[1] ?? "0", 10),
      hyperscanUrl:
        hyperscanUrlMatch?.[1] ??
        `https://www.hyperscan.dev/data?did=${encodeURIComponent(fallbackDid)}`,
      blueskyUrl:
        blueskyUrlMatch?.[1] ??
        `https://bsky.app/profile/${encodeURIComponent(fallbackDid)}`,
      collections,
      recentRecords,
    };
  }

  // ── Markdown Helpers ──────────────────────────────────────────────────────

  private extractField(section: string, fieldName: string): string | null {
    const regex = new RegExp(`- \\*\\*${fieldName}:\\*\\*\\s*\`?([^\`\\n]+)\`?`);
    const match = regex.exec(section);
    return match?.[1]?.trim() ?? null;
  }

  private extractDescription(section: string): string {
    // Get the line right after the title (before the first metadata field)
    const lines = section.split("\n");
    let afterTitle = false;
    for (const line of lines) {
      if (line.startsWith("### ")) {
        afterTitle = true;
        continue;
      }
      if (afterTitle) {
        const trimmed = line.trim();
        // Skip empty lines
        if (!trimmed) continue;
        // Stop at metadata or block quotes
        if (trimmed.startsWith("- **") || trimmed.startsWith(">") || trimmed.startsWith("**Full")) {
          break;
        }
        return trimmed;
      }
    }
    return "";
  }

  // ── Cache Helpers ─────────────────────────────────────────────────────────

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, { data, cachedAt: Date.now(), ttlMs });
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let instance: HyperscanService | null = null;

export function getHyperscanService(): HyperscanService {
  instance ??= new HyperscanService();
  return instance;
}
