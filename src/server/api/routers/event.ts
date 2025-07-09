import { z } from "zod";
import { Client as NotionClient } from "@notionhq/client";

import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

// Define the event data structure based on your sample - more flexible to handle real-world data
const EventDataSchema = z.object({
  id: z.string(),
  description: z.string().default(""),
  banner: z.string().nullable().optional(),
  starred: z.boolean().default(false),
  event: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  city: z.array(z.string()).default([]),
  country: z.array(z.string()).default([]),
  region: z.array(z.string()).default([]),
  timezone: z.array(z.string()).default([]),
  link: z.string(),
  organizer: z.string().nullable().default(""),
  twitter: z.string().nullable().optional(),
  telegram: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  usersGoingObj: z.array(z.object({
    handle: z.string(),
    avatar: z.string(),
    name: z.string(),
    followerCount: z.number(),
    airtableId: z.string(),
  })).default([]),
  usersInterestedObj: z.array(z.object({
    handle: z.string(),
    avatar: z.string(),
    name: z.string(),
    followerCount: z.number(),
    airtableId: z.string(),
  })).default([]),
  benefits: z.string().nullable().optional(),
  series: z.array(z.object({
    id: z.string(),
    title: z.string(),
    color: z.string(),
    slug: z.string(),
    shortSlug: z.string(),
    visible: z.boolean(),
    clickable: z.boolean(),
    logo: z.string(),
    banner: z.string(),
  })).default([]),
  slug: z.string().default(""),
  shortSlug: z.string().default(""),
  logo: z.union([z.string(), z.object({}).passthrough()]).nullable().optional(),
  created: z.string().default(""),
  promoted: z.union([z.boolean(), z.array(z.unknown())]).default(false),
  promoType: z.array(z.string()).default([]),
  companies: z.array(z.string()).default([]),
  showCompaniesAttendingUnderEvent: z.boolean().default(false),
  paidEvent: z.boolean().default(false),
  hostIds: z.array(z.string()).default([]),
  creator: z.string().nullable().default(""),
  colivingBanner: z.string().nullable().optional(),
  promoStatus: z.array(z.union([z.string(), z.boolean()])).default([]),
});

type EventData = z.infer<typeof EventDataSchema>;

/**
 * Syncs an array of events to Notion database
 * Checks if event already exists and only inserts new ones
 */
async function syncEventsToNotion(events: EventData[]): Promise<{
  synced: number;
  skipped: number;
  errors: Array<{ eventId: string; error: string }>;
}> {
  const notionToken = process.env.NOTION_TOKEN;
  const notionEventsDbId = process.env.NOTION_EVENTS_DATABASE_ID;
  
  if (!notionToken || !notionEventsDbId) {
    throw new Error("Notion integration token or events database ID not set in environment variables.");
  }

  const notion = new NotionClient({ auth: notionToken });
  
  let synced = 0;
  let skipped = 0;
  const errors: Array<{ eventId: string; error: string }> = [];

  for (const event of events) {
    try {
      // Check if event already exists in Notion using Event Name
      const existingEvent = await notion.databases.query({
        database_id: notionEventsDbId,
        filter: {
          property: "Event Name",
          title: {
            equals: event.event,
          },
        },
      });

      if (existingEvent.results.length > 0) {
        console.log(`Event "${event.event}" already exists in Notion, skipping...`);
        skipped++;
        continue;
      }

      // Prepare location string
      const locationParts = [];
      if (event.city.length > 0) locationParts.push(event.city.join(", "));
      if (event.country.length > 0) locationParts.push(event.country.join(", "));
      const location = locationParts.join(", ");

      // Determine event type based on tags
      let eventType = "Conference"; // default
      if (event.tags.includes("Coliving")) eventType = "Coliving";
      else if (event.tags.includes("Hackathon")) eventType = "Hackathon";
      else if (event.tags.includes("Conference")) eventType = "Conference";

      // Create new event in Notion matching the schema from screenshot
      const properties = {
        "Event Name": {
          title: [{ text: { content: event.event } }],
        },
        "Start Date": {
          date: { start: event.startDate },
        },
        "End Date": {
          date: { start: event.endDate },
        },
        "Location": {
          rich_text: [{ text: { content: location } }],
        },
        "Event Type": {
          select: { name: eventType },
        },
        "Focus Areas": {
          multi_select: event.topics.map(topic => ({ name: topic })),
        },
        "Organizer": {
          rich_text: [{ text: { content: event.organizer || "Unknown" } }],
        },
        "Attending Status": {
          select: { name: "Interested" }, // Default status
        },
        "Event URL": {
          url: event.link,
        },
        "Banner": event.banner ? { url: event.banner } : undefined,
        "City": event.city.length ? { multi_select: event.city.map(c => ({ name: c })) } : undefined,
        "Country": event.country.length ? { multi_select: event.country.map(c => ({ name: c })) } : undefined,
        "Region": event.region.length ? { multi_select: event.region.map(r => ({ name: r })) } : undefined,
        "Timezone": event.timezone.length ? { multi_select: event.timezone.map(tz => ({ name: tz })) } : undefined,
        "Twitter": event.twitter ? { rich_text: [{ text: { content: event.twitter } }] } : undefined,
        "Telegram": event.telegram ? { rich_text: [{ text: { content: event.telegram } }] } : undefined,
        "Tags": event.tags.length ? { multi_select: event.tags.map(tag => ({ name: tag })) } : undefined,
        "Slug": event.slug ? { rich_text: [{ text: { content: event.slug } }] } : undefined,
        "Short Slug": event.shortSlug ? { rich_text: [{ text: { content: event.shortSlug } }] } : undefined,
        "Logo": event.logo
          ? typeof event.logo === "string"
            ? { url: event.logo }
            : { url: "" } // or handle object logo as needed
          : undefined,
      };

      // Remove undefined properties
      const filteredProperties = Object.fromEntries(
        Object.entries(properties).filter(([_, v]) => v !== undefined)
      );

      await notion.pages.create({
        parent: { database_id: notionEventsDbId },
        properties: filteredProperties as Record<string, any>,
      });

      synced++;
      console.log(`Successfully synced event ${event.id} to Notion`);
    } catch (error) {
      console.error(`Error syncing event ${event.id}:`, error);
      errors.push({
        eventId: event.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { synced, skipped, errors };
}

export const eventRouter = createTRPCRouter({
  getEvent: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { id: input.id },
        include: {
          sponsors: {
            include: {
              sponsor: {
                include: {
                  contacts: true,
                },
              },
            },
          },
        },
      });
      return event;
    }),

  getEvents: publicProcedure.query(async ({ ctx }) => {
    const events = await ctx.db.event.findMany({
      include: {
        sponsors: {
          include: {
            sponsor: {
              include: {
                contacts: true,
              },
            },
          },
        },
      },
    });
    return events;
  }),

  addSponsorToEvent: publicProcedure
    .input(z.object({ 
      eventId: z.string(),
      sponsorId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if the relationship already exists
      const existing = await ctx.db.eventSponsor.findUnique({
        where: {
          eventId_sponsorId: {
            eventId: input.eventId,
            sponsorId: input.sponsorId,
          },
        },
      });

      if (existing) {
        throw new Error("Sponsor is already added to this event");
      }

      const eventSponsor = await ctx.db.eventSponsor.create({
        data: {
          eventId: input.eventId,
          sponsorId: input.sponsorId,
        },
        include: {
          sponsor: true,
        },
      });

      return eventSponsor;
    }),

  updateSponsorQualified: publicProcedure
    .input(z.object({ 
      eventId: z.string(),
      sponsorId: z.string(),
      qualified: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const eventSponsor = await ctx.db.eventSponsor.update({
        where: {
          eventId_sponsorId: {
            eventId: input.eventId,
            sponsorId: input.sponsorId,
          },
        },
        data: {
          qualified: input.qualified,
        },
        include: {
          sponsor: {
            include: {
              contacts: true,
            },
          },
        },
      });

      return eventSponsor;
    }),

  syncEventsToNotion: publicProcedure
    .input(z.object({ events: z.array(EventDataSchema) }))
    .mutation(async ({ input }) => {
      const result = await syncEventsToNotion(input.events);
      return result;
    }),
}); 