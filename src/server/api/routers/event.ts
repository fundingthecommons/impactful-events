import { z } from "zod";
import { Client as NotionClient } from "@notionhq/client";
import type { Prisma } from "@prisma/client";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
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

// Type definitions for better type safety
type EventWithSponsors = Prisma.EventGetPayload<{
  include: {
    sponsors: {
      include: {
        sponsor: {
          include: {
            contacts: true;
          };
        };
      };
    };
    _count: {
      select: {
        applications: true;
        userRoles: true;
        sponsors?: true;
      };
    };
  };
}>;

type ApplicationWithStatus = {
  status: string;
};

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
          rich_text: [{ text: { content: event.organizer ?? "Unknown" } }],
        },
        "Attending Status": {
          select: { name: "Interested" }, // Default status
        },
        "Event URL": {
          url: event.link,
        },
        "Banner": event.banner ? { url: event.banner } : undefined,
        "City": event.city?.length ? { multi_select: event.city.map(c => ({ name: c })) } : undefined,
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
      const filteredProperties: Record<string, NonNullable<typeof properties[keyof typeof properties]>> = {};
      Object.entries(properties).forEach(([key, value]) => {
        if (value !== undefined) {
          filteredProperties[key] = value;
        }
      });

      await notion.pages.create({
        parent: { database_id: notionEventsDbId },
        properties: filteredProperties,
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

/**
 * Syncs users from events to Notion Contacts database
 * Extracts users from usersGoingObj array and creates contact records
 */
async function syncUsersToNotion(events: EventData[]): Promise<{
  synced: number;
  skipped: number;
  errors: Array<{ userId: string; error: string }>;
}> {
  const notionToken = process.env.NOTION_TOKEN;
  const notionContactsDbId = process.env.NOTION_CONTACTS_DATABASE_ID;
  
  if (!notionToken || !notionContactsDbId) {
    throw new Error("Notion integration token or contacts database ID not set in environment variables.");
  }

  const notion = new NotionClient({ auth: notionToken });
  
  let synced = 0;
  const skipped = 0;
  const errors: Array<{ userId: string; error: string }> = [];
  const processedAirtableIds = new Set<string>();

  for (const event of events) {
    if (!event.usersGoingObj || event.usersGoingObj.length === 0) {
      continue;
    }

    for (const user of event.usersGoingObj) {
      try {
        // Skip if we've already processed this user in this batch
        if (processedAirtableIds.has(user.airtableId)) {
          continue;
        }
        processedAirtableIds.add(user.airtableId);

        // For now, skip duplicate checking since the airtableId property might not exist yet
        // We'll rely on the processedAirtableIds Set to avoid duplicates in this batch
        console.log(`Processing user ${user.airtableId}...`);

        // Use user.name directly as First name, no parsing needed
        const firstName = user.name ?? "";

        // Determine if handle is a crypto address (starts with 0x) or social handle
        const isTwitterHandle = user.handle && !user.handle.startsWith("0x");

        // Create new contact in Notion matching the schema from screenshot
        const baseContactProperties = {
          "First name": {
            rich_text: [{ text: { content: firstName } }],
          },
          "avatar": {
            rich_text: [{ text: { content: user.avatar ?? "" } }],
          },
          "followerCount": {
            number: user.followerCount ?? 0,
          },
          "airtableId": {
            rich_text: [{ text: { content: user.airtableId } }],
          },
          "Lead Source": {
            select: { name: "CryptoNomadsImport" },
          },
          "Source": {
            rich_text: [{ text: { content: "CryptoNomadsImport" } }],
          },
          "Current Process Status": {
            select: { name: "New Lead" },
          },
        };

        // Create dynamic properties object
        const dynamicProperties: Record<string, object> = {};
        
        // Add Twitter and Telegram only if handle doesn't start with "0x"
        if (isTwitterHandle) {
          dynamicProperties.Twitter = {
            rich_text: [{ text: { content: user.handle } }],
          };
          dynamicProperties.Telegram = {
            rich_text: [{ text: { content: user.handle } }],
          };
        }

        // Add Notes with any additional context
        const notesContent = isTwitterHandle 
          ? `Event: ${event.event}` 
          : `Event: ${event.event} | Handle: ${user.handle}`;
        
        dynamicProperties.Notes = {
          rich_text: [{ text: { content: notesContent } }],
        };

        // Add Event Series if available and has valid entries
        if (event.series && event.series.length > 0) {
          const validSeries = event.series.filter(s => s.title && s.title.trim() !== "");
          if (validSeries.length > 0) {
            dynamicProperties["Event Series"] = {
              multi_select: validSeries.map(s => ({ name: s.title })),
            };
          }
        }

        // Combine base and dynamic properties
        const contactProperties = {
          ...baseContactProperties,
          ...dynamicProperties
        };
        
        await notion.pages.create({
          parent: { database_id: notionContactsDbId },
          properties: contactProperties,
        });

        synced++;
        console.log(`Successfully synced user ${user.airtableId} to Notion contacts`);
      } catch (error) {
        console.error(`Error syncing user ${user.airtableId}:`, error);
        errors.push({
          userId: user.airtableId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
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

    console.log("🔍 getEvents query result:", {
      totalEvents: events.length,
      eventNames: events.map(e => e.name),
      eventDates: events.map(e => ({ name: e.name, start: e.startDate, end: e.endDate }))
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

  syncUsersToNotion: publicProcedure
    .input(z.object({ events: z.array(EventDataSchema) }))
    .mutation(async ({ input }) => {
      const result = await syncUsersToNotion(input.events);
      return result;
    }),

  // Dashboard-specific queries
  getSponsoredEvents: protectedProcedure.query(async ({ ctx }) => {
    // Get events where user has sponsor role
    const userRoles = await ctx.db.userRole.findMany({
      where: {
        userId: ctx.session.user.id,
        role: {
          name: "sponsor"
        }
      },
      include: {
        event: {
          include: {
            sponsors: {
              include: {
                sponsor: true
              }
            },
            _count: {
              select: {
                applications: true,
                userRoles: true,
              }
            }
          }
        }
      }
    });

    return userRoles.map(ur => ({
      ...ur.event,
      // Find the sponsor relationship for this user's organization - safe array access with proper type
      sponsorInfo: ur.event.sponsors.length > 0 ? {
        id: ur.event.sponsors[0]!.id,
        sponsor: {
          id: ur.event.sponsors[0]!.sponsor.id,
          name: ur.event.sponsors[0]!.sponsor.name,
        }
      } : undefined
    }));
  }),

  getMentorEvents: protectedProcedure.query(async ({ ctx }) => {
    // Get events where user has mentor role
    const userRoles = await ctx.db.userRole.findMany({
      where: {
        userId: ctx.session.user.id,
        role: {
          name: "mentor"
        }
      },
      include: {
        event: {
          include: {
            _count: {
              select: {
                applications: true,
                userRoles: true,
              }
            }
          }
        }
      }
    });

    return userRoles.map(ur => ur.event);
  }),

  getOrganizerEvents: protectedProcedure.query(async ({ ctx }) => {
    // Get events where user has organizer role OR created the event
    const userRoles = await ctx.db.userRole.findMany({
      where: {
        userId: ctx.session.user.id,
        role: {
          name: "organizer"
        }
      },
      include: {
        event: {
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
            _count: {
              select: {
                applications: true,
                userRoles: true,
                sponsors: true,
              }
            }
          }
        }
      }
    });

    const createdEvents = await ctx.db.event.findMany({
      where: {
        createdById: ctx.session.user.id,
      },
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
        _count: {
          select: {
            applications: true,
            userRoles: true,
            sponsors: true,
          }
        }
      }
    });

    // Combine and deduplicate with proper type safety
    const roleEvents: EventWithSponsors[] = userRoles.map(ur => ur.event);
    const allEvents: EventWithSponsors[] = [...roleEvents, ...createdEvents];
    const uniqueEvents = allEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    );

    return uniqueEvents;
  }),

  getAvailableEvents: publicProcedure.query(async ({ ctx }) => {
    // Get events that are current, ongoing, or upcoming (not past events)
    const now = new Date();
    const events = await ctx.db.event.findMany({
      where: {
        OR: [
          // Ongoing events (started but not ended)
          {
            startDate: { lte: now },
            endDate: { gte: now }
          },
          // Future events (not started yet)
          {
            startDate: { gt: now }
          }
        ]
      },
      include: {
        _count: {
          select: {
            applications: true,
          }
        }
      },
      orderBy: [
        // Prioritize ongoing events first, then upcoming
        { startDate: "asc" }
      ]
    });

    console.log("🔍 getAvailableEvents query result:", {
      totalEvents: events.length,
      eventNames: events.map(e => e.name),
      now: now.toISOString()
    });

    return events;
  }),

  getOrganizerStats: protectedProcedure.query(async ({ ctx }) => {
    // Get stats for events the user organizes
    const userRoles = await ctx.db.userRole.findMany({
      where: {
        userId: ctx.session.user.id,
        role: {
          name: "organizer"
        }
      },
      select: {
        eventId: true,
      }
    });

    const createdEvents = await ctx.db.event.findMany({
      where: {
        createdById: ctx.session.user.id,
      },
      select: {
        id: true,
      }
    });

    const allEventIds = [...userRoles.map(ur => ur.eventId), ...createdEvents.map(e => e.id)];
    const uniqueEventIds = [...new Set(allEventIds)];

    if (uniqueEventIds.length === 0) {
      return {
        totalEvents: 0,
        totalApplications: 0,
        averageAcceptanceRate: 0,
      };
    }

    // Calculate stats with proper type safety
    const applications: ApplicationWithStatus[] = await ctx.db.application.findMany({
      where: {
        eventId: {
          in: uniqueEventIds,
        }
      },
      select: {
        status: true,
      }
    });

    const totalApplications = applications.length;
    const acceptedApplications = applications.filter(app => app.status === "ACCEPTED").length;
    const averageAcceptanceRate = totalApplications > 0 
      ? Math.round((acceptedApplications / totalApplications) * 100) 
      : 0;

    return {
      totalEvents: uniqueEventIds.length,
      totalApplications,
      averageAcceptanceRate,
    };
  }),
}); 
