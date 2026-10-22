import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@prisma/client";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminOrStaffProcedure,
} from "~/server/api/trpc";
import { isAdminOrStaff } from "~/server/api/utils/scheduleAuth";

// SECURITY: the sponsor-residency procedures serve two kinds of caller: FtC
// staff, and sponsor representatives who hold the per-event `sponsor`
// UserRole. That role is granted by staff invitation or assignment
// (role.assignEventRole); an invitation claim is only as strong as sign-up
// email verification, since EVENT_ROLE invitations are still accepted without
// it (acceptInvitations.ts; tracked follow-up). The schema has no per-Sponsor
// user link, so "holds the sponsor role on the EventSponsor's event" is the
// strongest affiliation the DB can offer. The admin/staff bypass is
// re-checked against the DB rather than trusting the JWT role claim, which is
// only set at sign-in.
async function assertSponsorAccessForEvent(
  db: PrismaClient,
  userId: string,
  eventId: string,
): Promise<void> {
  const [sponsorRole, dbUser] = await Promise.all([
    db.userRole.findFirst({
      where: { userId, eventId, role: { name: "sponsor" } },
      select: { id: true },
    }),
    db.user.findUnique({ where: { id: userId }, select: { role: true } }),
  ]);
  if (sponsorRole || isAdminOrStaff(dbUser?.role)) return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Sponsor access to this event is required",
  });
}

// SECURITY: resolve a client-supplied eventSponsorId to its event in the DB
// before gating — the id is attacker-controlled input, never proof of
// affiliation.
async function assertSponsorAccessForEventSponsor(
  db: PrismaClient,
  userId: string,
  eventSponsorId: string,
): Promise<void> {
  const eventSponsor = await db.eventSponsor.findUnique({
    where: { id: eventSponsorId },
    select: { eventId: true },
  });
  if (!eventSponsor) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Event sponsor not found",
    });
  }
  await assertSponsorAccessForEvent(db, userId, eventSponsor.eventId);
}

export const sponsorRouter = createTRPCRouter({
  // SECURITY: admin/staff only. Sponsor records are the shared CRM; Sponsor.name
  // is unique, so without this gate any authenticated (incl. self-registered)
  // user could squat a real sponsor's name or plant a logo/URL that renders on
  // the public hyperboard once the record is attached to an event. No client
  // code calls this procedure.
  createSponsor: adminOrStaffProcedure
    .input(
      z.object({
        name: z.string().min(1, "Sponsor name is required"),
        websiteUrl: z
          .string()
          .url("Must be a valid URL")
          .optional()
          .or(z.literal("")),
        logoUrl: z
          .string()
          .url("Must be a valid URL")
          .optional()
          .or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sponsor = await ctx.db.sponsor.create({
        data: {
          name: input.name,
          websiteUrl: input.websiteUrl === "" ? null : input.websiteUrl,
          logoUrl: input.logoUrl === "" ? null : input.logoUrl,
        },
      });
      return sponsor;
    }),

  getSponsors: adminOrStaffProcedure.query(async ({ ctx }) => {
    const sponsors = await ctx.db.sponsor.findMany({
      include: {
        contacts: true,
        events: true,
        categories: {
          include: {
            category: true,
          },
        },
      },
    });
    return sponsors;
  }),

  getSponsor: adminOrStaffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sponsor = await ctx.db.sponsor.findUnique({
        where: { id: input.id },
        include: {
          contacts: true,
          events: {
            include: {
              event: true,
            },
          },
        },
      });
      return sponsor;
    }),

  getSponsorCommunications: adminOrStaffProcedure
    .input(
      z.object({
        sponsorId: z.string(),
        limit: z.number().optional().default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get all contacts for this sponsor
      const contacts = await ctx.db.contact.findMany({
        where: { sponsorId: input.sponsorId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          telegram: true,
        },
      });

      if (contacts.length === 0) {
        return [];
      }

      // Build OR conditions for all contact emails and telegram usernames
      const whereConditions = [];
      for (const contact of contacts) {
        if (contact.email) {
          whereConditions.push({ toEmail: contact.email });
        }
        if (contact.telegram) {
          whereConditions.push({ toTelegram: contact.telegram });
        }
      }

      if (whereConditions.length === 0) {
        return [];
      }

      // Query all communications to any of these contacts
      const communications = await ctx.db.communication.findMany({
        where: {
          OR: whereConditions,
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          channel: true,
          type: true,
          status: true,
          subject: true,
          textContent: true,
          sentAt: true,
          createdAt: true,
          createdBy: true,
          toEmail: true,
          toTelegram: true,
          fromEmail: true,
          fromTelegram: true,
        },
      });

      // Enrich communications with contact info
      return communications.map((comm) => {
        const contact = contacts.find(
          (c) => c.email === comm.toEmail || c.telegram === comm.toTelegram,
        );
        return {
          ...comm,
          contact: contact
            ? {
                id: contact.id,
                firstName: contact.firstName,
                lastName: contact.lastName,
              }
            : null,
        };
      });
    }),

  // Get sponsor residency data including visit requests and deliverables
  getSponsorResidencyData: protectedProcedure
    .input(z.object({ eventSponsorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const eventSponsor = await ctx.db.eventSponsor.findUnique({
        where: { id: input.eventSponsorId },
        include: {
          sponsor: true,
          event: true,
          visitRequests: {
            orderBy: { createdAt: "desc" },
          },
          deliverables: {
            orderBy: [{ category: "asc" }, { createdAt: "asc" }],
          },
        },
      });

      if (!eventSponsor) {
        return null;
      }

      // SECURITY: sponsor-role-on-this-event or admin/staff only. Without this
      // gate any authenticated (incl. self-registered) user could read every
      // sponsor's visit requests (purpose, logistics requirements, scheduled
      // dates, staff notes) and deliverable commitments by iterating ids.
      await assertSponsorAccessForEvent(
        ctx.db,
        ctx.session.user.id,
        eventSponsor.eventId,
      );

      return eventSponsor;
    }),

  // Create a visit request
  createVisitRequest: protectedProcedure
    .input(
      z.object({
        eventSponsorId: z.string(),
        visitType: z.enum(["KICKOFF", "MENTORSHIP", "DEMO_DAY", "CUSTOM"]),
        preferredDates: z.array(z.date()),
        numAttendees: z.number().min(1).max(10),
        purpose: z.string().min(1),
        requirements: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // SECURITY: sponsor-role-on-this-event or admin/staff only — this is the
      // sponsor's own "request a visit" form on the residency dashboard.
      // Without this gate any authenticated user could file visit requests in
      // any sponsor's name, which staff would then act on.
      await assertSponsorAccessForEventSponsor(
        ctx.db,
        ctx.session.user.id,
        input.eventSponsorId,
      );

      const visitRequest = await ctx.db.sponsorVisitRequest.create({
        data: {
          eventSponsorId: input.eventSponsorId,
          visitType: input.visitType,
          preferredDates: input.preferredDates,
          numAttendees: input.numAttendees,
          purpose: input.purpose,
          requirements: input.requirements,
        },
        include: {
          eventSponsor: {
            include: {
              sponsor: true,
              event: true,
            },
          },
        },
      });
      return visitRequest;
    }),

  // Update visit request status
  // SECURITY: admin/staff only. This is the staff side of the visit workflow
  // (approve / schedule / complete, plus the admin `notes` field); no client
  // code calls it. Without this gate any authenticated user could self-approve
  // or cancel any sponsor's visit, or rewrite staff notes.
  updateVisitRequestStatus: adminOrStaffProcedure
    .input(
      z.object({
        visitRequestId: z.string(),
        status: z.enum([
          "PENDING",
          "APPROVED",
          "SCHEDULED",
          "COMPLETED",
          "CANCELLED",
        ]),
        scheduledDate: z.date().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updatedRequest = await ctx.db.sponsorVisitRequest.update({
        where: { id: input.visitRequestId },
        data: {
          status: input.status,
          scheduledDate: input.scheduledDate,
          notes: input.notes,
        },
      });
      return updatedRequest;
    }),

  // Create deliverable
  // SECURITY: admin/staff only. Deliverables are the sponsor's commitments as
  // recorded by FtC; no client code calls this. Without this gate any
  // authenticated user could attach arbitrary deliverables to any sponsor.
  createDeliverable: adminOrStaffProcedure
    .input(
      z.object({
        eventSponsorId: z.string(),
        category: z.enum(["TECHNICAL", "SUPPORT", "PATHWAYS", "VISIBILITY"]),
        title: z.string().min(1),
        description: z.string().min(1),
        dueDate: z.date().optional(),
        estimatedHours: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const deliverable = await ctx.db.sponsorDeliverable.create({
        data: {
          eventSponsorId: input.eventSponsorId,
          category: input.category,
          title: input.title,
          description: input.description,
          dueDate: input.dueDate,
          estimatedHours: input.estimatedHours,
        },
      });
      return deliverable;
    }),

  // Update deliverable status
  updateDeliverableStatus: protectedProcedure
    .input(
      z.object({
        deliverableId: z.string(),
        status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
        actualHours: z.number().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // SECURITY: sponsor-role-on-this-event or admin/staff only — sponsors
      // mark their own deliverables in progress / complete from the residency
      // dashboard. Resolve the deliverable to its event in the DB first; the
      // deliverableId is attacker-controlled. Without this gate any
      // authenticated user could flip any sponsor's deliverables.
      const deliverable = await ctx.db.sponsorDeliverable.findUnique({
        where: { id: input.deliverableId },
        select: { eventSponsor: { select: { eventId: true } } },
      });
      if (!deliverable) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deliverable not found",
        });
      }
      await assertSponsorAccessForEvent(
        ctx.db,
        ctx.session.user.id,
        deliverable.eventSponsor.eventId,
      );

      const updateData: {
        status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
        actualHours?: number;
        notes?: string;
        completedAt?: Date;
      } = {
        status: input.status,
        actualHours: input.actualHours,
        notes: input.notes,
      };

      if (input.status === "COMPLETED") {
        updateData.completedAt = new Date();
      }

      const updatedDeliverable = await ctx.db.sponsorDeliverable.update({
        where: { id: input.deliverableId },
        data: updateData,
      });
      return updatedDeliverable;
    }),

  // Bulk create default deliverables for a sponsor
  createDefaultDeliverables: protectedProcedure
    .input(z.object({ eventSponsorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // SECURITY: sponsor-role-on-this-event or admin/staff only (the residency
      // dashboard auto-seeds these on first load). Also made idempotent: the
      // previous code appended five rows on every call, so any caller could
      // flood a sponsor's deliverable list by repeating the request.
      await assertSponsorAccessForEventSponsor(
        ctx.db,
        ctx.session.user.id,
        input.eventSponsorId,
      );

      const existingCount = await ctx.db.sponsorDeliverable.count({
        where: { eventSponsorId: input.eventSponsorId },
      });
      if (existingCount > 0) {
        return [];
      }

      const defaultDeliverables = [
        {
          category: "TECHNICAL" as const,
          title: "Deep-dive Workshops",
          description:
            "Host 2-3 technical workshops during the residency covering relevant technology topics",
          estimatedHours: 8,
        },
        {
          category: "TECHNICAL" as const,
          title: "Office Hours",
          description:
            "Provide 1-2 office hour sessions for direct mentoring and guidance",
          estimatedHours: 4,
        },
        {
          category: "SUPPORT" as const,
          title: "Code Examples & Templates",
          description:
            "Provide reference materials, blueprints, and starter templates for builders",
          estimatedHours: 6,
        },
        {
          category: "PATHWAYS" as const,
          title: "Ecosystem Integration Session",
          description:
            "Present next steps and pathways into your ecosystem for resident builders",
          estimatedHours: 2,
        },
        {
          category: "VISIBILITY" as const,
          title: "Demo Day Participation",
          description:
            "Participate in final showcase, provide feedback, and amplify standout projects",
          estimatedHours: 4,
        },
      ];

      const createdDeliverables = await Promise.all(
        defaultDeliverables.map((deliverable) =>
          ctx.db.sponsorDeliverable.create({
            data: {
              eventSponsorId: input.eventSponsorId,
              ...deliverable,
            },
          }),
        ),
      );

      return createdDeliverables;
    }),

  // Get sponsor stats for dashboard
  // SECURITY: intentionally protectedProcedure with no role gate — the query
  // is keyed to ctx.session.user.id and returns only aggregate counts for
  // events where the caller themself holds the sponsor role, so a caller
  // without that role gets zeros, never another sponsor's data.
  getSponsorStats: protectedProcedure.query(async ({ ctx }) => {
    // Find all events where user has sponsor role
    const userRoles = await ctx.db.userRole.findMany({
      where: {
        userId: ctx.session.user.id,
        role: {
          name: "sponsor",
        },
      },
      include: {
        event: {
          include: {
            _count: {
              select: {
                applications: true,
                userRoles: true,
              },
            },
          },
        },
      },
    });

    const totalEvents = userRoles.length;
    const totalApplications = userRoles.reduce(
      (sum, ur) => sum + ur.event._count.applications,
      0,
    );
    const totalParticipants = userRoles.reduce(
      (sum, ur) => sum + ur.event._count.userRoles,
      0,
    );

    // Calculate impact metrics (this could be enhanced with more sophisticated metrics)
    const impactScore =
      totalEvents > 0
        ? Math.round((totalApplications + totalParticipants) / totalEvents)
        : 0;

    return {
      totalEvents,
      totalApplications,
      totalReach: totalParticipants,
      impactScore,
    };
  }),

  // Get sponsors for hyperboard visualization
  getSponsorsForHyperboard: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // SECURITY: public by design (the hyperboard is a public page). The
      // select is pinned to id / name / logo / qualified so nothing else on
      // Sponsor (contacts, categories, geckoCoin) can leak if the mapping
      // below ever changes; the previous `include` fetched the whole row.
      const eventSponsors = await ctx.db.eventSponsor.findMany({
        where: {
          eventId: input.eventId,
        },
        select: {
          qualified: true,
          sponsor: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
        },
      });

      // Sponsor funding amounts (in thousands)
      const sponsorFunding: Record<string, number> = {
        "Protocol Labs": 35,
        NEAR: 20,
        Stellar: 17,
        Octant: 17,
        "Human Tech": 10,
        Logos: 7,
        Drips: 5,
      };

      // Transform sponsors into hyperboard entry format
      return eventSponsors.map((es) => {
        const fundingAmount = sponsorFunding[es.sponsor.name] ?? 1;

        return {
          type: "sponsor",
          id: es.sponsor.id,
          avatar: es.sponsor.logoUrl,
          displayName: es.sponsor.name,
          value: fundingAmount, // Tile size based on funding amount
          isBlueprint: !es.qualified,
        };
      });
    }),
});
