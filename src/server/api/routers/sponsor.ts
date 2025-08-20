import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

export const sponsorRouter = createTRPCRouter({
  getSponsors: publicProcedure.query(async ({ ctx }) => {
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

  getSponsor: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sponsor = await ctx.db.sponsor.findUnique({
        where: { id: input.id },
        include: {
          contacts: true,
          events: true,
        },
      });
      return sponsor;
    }),

  // Get sponsor residency data including visit requests and deliverables
  getSponsorResidencyData: publicProcedure
    .input(z.object({ eventSponsorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const eventSponsor = await ctx.db.eventSponsor.findUnique({
        where: { id: input.eventSponsorId },
        include: {
          sponsor: true,
          event: true,
          visitRequests: {
            orderBy: { createdAt: 'desc' }
          },
          deliverables: {
            orderBy: [{ category: 'asc' }, { createdAt: 'asc' }]
          }
        }
      });
      return eventSponsor;
    }),

  // Create a visit request
  createVisitRequest: publicProcedure
    .input(z.object({
      eventSponsorId: z.string(),
      visitType: z.enum(['KICKOFF', 'MENTORSHIP', 'DEMO_DAY', 'CUSTOM']),
      preferredDates: z.array(z.date()),
      numAttendees: z.number().min(1).max(10),
      purpose: z.string().min(1),
      requirements: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
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
              event: true
            }
          }
        }
      });
      return visitRequest;
    }),

  // Update visit request status
  updateVisitRequestStatus: publicProcedure
    .input(z.object({
      visitRequestId: z.string(),
      status: z.enum(['PENDING', 'APPROVED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']),
      scheduledDate: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updatedRequest = await ctx.db.sponsorVisitRequest.update({
        where: { id: input.visitRequestId },
        data: {
          status: input.status,
          scheduledDate: input.scheduledDate,
          notes: input.notes,
        }
      });
      return updatedRequest;
    }),

  // Create deliverable
  createDeliverable: publicProcedure
    .input(z.object({
      eventSponsorId: z.string(),
      category: z.enum(['TECHNICAL', 'SUPPORT', 'PATHWAYS', 'VISIBILITY']),
      title: z.string().min(1),
      description: z.string().min(1),
      dueDate: z.date().optional(),
      estimatedHours: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const deliverable = await ctx.db.sponsorDeliverable.create({
        data: {
          eventSponsorId: input.eventSponsorId,
          category: input.category,
          title: input.title,
          description: input.description,
          dueDate: input.dueDate,
          estimatedHours: input.estimatedHours,
        }
      });
      return deliverable;
    }),

  // Update deliverable status
  updateDeliverableStatus: publicProcedure
    .input(z.object({
      deliverableId: z.string(),
      status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
      actualHours: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: {
        status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
        actualHours?: number;
        notes?: string;
        completedAt?: Date;
      } = {
        status: input.status,
        actualHours: input.actualHours,
        notes: input.notes,
      };

      if (input.status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }

      const updatedDeliverable = await ctx.db.sponsorDeliverable.update({
        where: { id: input.deliverableId },
        data: updateData
      });
      return updatedDeliverable;
    }),

  // Bulk create default deliverables for a sponsor
  createDefaultDeliverables: publicProcedure
    .input(z.object({ eventSponsorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const defaultDeliverables = [
        {
          category: 'TECHNICAL' as const,
          title: 'Deep-dive Workshops',
          description: 'Host 2-3 technical workshops during the residency covering relevant technology topics',
          estimatedHours: 8
        },
        {
          category: 'TECHNICAL' as const,
          title: 'Office Hours',
          description: 'Provide 1-2 office hour sessions for direct mentoring and guidance',
          estimatedHours: 4
        },
        {
          category: 'SUPPORT' as const,
          title: 'Code Examples & Templates',
          description: 'Provide reference materials, blueprints, and starter templates for builders',
          estimatedHours: 6
        },
        {
          category: 'PATHWAYS' as const,
          title: 'Ecosystem Integration Session',
          description: 'Present next steps and pathways into your ecosystem for resident builders',
          estimatedHours: 2
        },
        {
          category: 'VISIBILITY' as const,
          title: 'Demo Day Participation',
          description: 'Participate in final showcase, provide feedback, and amplify standout projects',
          estimatedHours: 4
        }
      ];

      const createdDeliverables = await Promise.all(
        defaultDeliverables.map(deliverable =>
          ctx.db.sponsorDeliverable.create({
            data: {
              eventSponsorId: input.eventSponsorId,
              ...deliverable
            }
          })
        )
      );

      return createdDeliverables;
    }),

  // Get sponsor stats for dashboard
  getSponsorStats: protectedProcedure.query(async ({ ctx }) => {
    // Find all events where user has sponsor role
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

    const totalEvents = userRoles.length;
    const totalApplications = userRoles.reduce((sum, ur) => sum + ur.event._count.applications, 0);
    const totalParticipants = userRoles.reduce((sum, ur) => sum + ur.event._count.userRoles, 0);

    // Calculate impact metrics (this could be enhanced with more sophisticated metrics)
    const impactScore = totalEvents > 0 ? Math.round((totalApplications + totalParticipants) / totalEvents) : 0;

    return {
      totalEvents,
      totalApplications,
      totalReach: totalParticipants,
      impactScore,
    };
  }),
}); 