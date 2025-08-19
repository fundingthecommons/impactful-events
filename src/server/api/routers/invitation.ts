import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { sendInvitationEmail } from "~/lib/email";

// Helper function to check if user has admin/staff role
function checkAdminAccess(userRole?: string | null) {
  if (!userRole || (userRole !== "admin" && userRole !== "staff")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin or staff access required",
    });
  }
}

// Schema definitions
const CreateInvitationSchema = z.object({
  email: z.string().email(),
  eventId: z.string(),
  roleId: z.string(),
  expiresAt: z.date().optional(),
});

const BulkCreateInvitationSchema = z.object({
  emails: z.array(z.string().email()),
  eventId: z.string(),
  roleId: z.string(),
  expiresAt: z.date().optional(),
});

const AcceptInvitationSchema = z.object({
  token: z.string(),
});

export const invitationRouter = createTRPCRouter({
  // Create a single invitation
  create: protectedProcedure
    .input(CreateInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Check if invitation already exists
      const existing = await ctx.db.invitation.findFirst({
        where: {
          email: input.email,
          eventId: input.eventId,
          roleId: input.roleId,
          status: "PENDING",
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation already exists for this email, event, and role combination",
        });
      }

      // Verify event and role exist
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      const role = await ctx.db.role.findUnique({
        where: { id: input.roleId },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      // Set default expiration to 30 days from now
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 30);

      const invitation = await ctx.db.invitation.create({
        data: {
          email: input.email,
          eventId: input.eventId,
          roleId: input.roleId,
          expiresAt: input.expiresAt ?? defaultExpiry,
          invitedBy: ctx.session.user.id,
        },
        include: {
          event: true,
          role: true,
        },
      });

      // Send invitation email
      try {
        await sendInvitationEmail({
          email: invitation.email,
          eventName: invitation.event.name,
          eventDescription: invitation.event.description ?? "Join us for this exciting event!",
          roleName: invitation.role.name,
          inviterName: ctx.session.user.name ?? "Event Admin",
          invitationToken: invitation.token,
          expiresAt: invitation.expiresAt,
        });
      } catch (error) {
        console.error("Failed to send invitation email:", error);
        // Don't throw error - invitation was created, email failure is not critical
      }

      return invitation;
    }),

  // Bulk create invitations
  bulkCreate: protectedProcedure
    .input(BulkCreateInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Verify event and role exist
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      const role = await ctx.db.role.findUnique({
        where: { id: input.roleId },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      // Check for existing invitations
      const existingInvitations = await ctx.db.invitation.findMany({
        where: {
          email: { in: input.emails },
          eventId: input.eventId,
          roleId: input.roleId,
          status: "PENDING",
        },
      });

      const existingEmails = new Set(existingInvitations.map(inv => inv.email));
      const newEmails = input.emails.filter(email => !existingEmails.has(email));

      if (newEmails.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All provided emails already have pending invitations for this event and role",
        });
      }

      // Set default expiration to 30 days from now
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 30);

      // Create invitations for new emails
      const invitationsData = newEmails.map(email => ({
        email,
        eventId: input.eventId,
        roleId: input.roleId,
        expiresAt: input.expiresAt ?? defaultExpiry,
        invitedBy: ctx.session.user.id,
      }));

      await ctx.db.invitation.createMany({
        data: invitationsData,
      });

      // Get created invitations with relations
      const createdInvitations = await ctx.db.invitation.findMany({
        where: {
          email: { in: newEmails },
          eventId: input.eventId,
          roleId: input.roleId,
          invitedBy: ctx.session.user.id,
        },
        include: {
          event: true,
          role: true,
        },
        orderBy: { createdAt: "desc" },
        take: newEmails.length,
      });

      // Send invitation emails
      const emailPromises = createdInvitations.map(async (invitation) => {
        try {
          await sendInvitationEmail({
            email: invitation.email,
            eventName: invitation.event.name,
            eventDescription: invitation.event.description ?? "Join us for this exciting event!",
            roleName: invitation.role.name,
            inviterName: ctx.session.user.name ?? "Event Admin",
            invitationToken: invitation.token,
            expiresAt: invitation.expiresAt,
          });
          return { email: invitation.email, success: true };
        } catch (error) {
          console.error(`Failed to send invitation email to ${invitation.email}:`, error);
          return { email: invitation.email, success: false, error };
        }
      });

      // Wait for all emails to be sent (but don't fail if some emails fail)
      const emailResults = await Promise.allSettled(emailPromises);
      const emailSuccesses = emailResults.filter(result => result.status === 'fulfilled').length;

      return {
        created: createdInvitations,
        skipped: existingEmails.size,
        total: input.emails.length,
        emailsSent: emailSuccesses,
      };
    }),

  // Get all invitations (admin only)
  getAll: protectedProcedure
    .input(z.object({
      eventId: z.string().optional(),
      status: z.enum(["PENDING", "ACCEPTED", "EXPIRED", "CANCELLED"]).optional(),
      email: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const invitations = await ctx.db.invitation.findMany({
        where: {
          ...(input.eventId && { eventId: input.eventId }),
          ...(input.status && { status: input.status }),
          ...(input.email && { email: { contains: input.email, mode: "insensitive" } }),
        },
        include: {
          event: true,
          role: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return invitations;
    }),

  // Get pending invitations for a specific email
  getPendingByEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      const invitations = await ctx.db.invitation.findMany({
        where: {
          email: input.email,
          status: "PENDING",
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          event: true,
          role: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return invitations;
    }),

  // Accept invitation by token
  acceptByToken: publicProcedure
    .input(AcceptInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { token: input.token },
        include: {
          event: true,
          role: true,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      if (invitation.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has already been processed",
        });
      }

      if (invitation.expiresAt < new Date()) {
        // Update invitation status to expired
        await ctx.db.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has expired",
        });
      }

      return invitation;
    }),

  // Accept invitation (called during user registration)
  accept: publicProcedure
    .input(z.object({
      email: z.string().email(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get all pending invitations for this email
      const invitations = await ctx.db.invitation.findMany({
        where: {
          email: input.email,
          status: "PENDING",
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          event: true,
          role: true,
        },
      });

      if (invitations.length === 0) {
        return { accepted: 0, roles: [] };
      }

      const acceptedRoles = [];

      // Process each invitation
      for (const invitation of invitations) {
        // Check if user already has this role for this event
        const existingRole = await ctx.db.userRole.findUnique({
          where: {
            userId_eventId_roleId: {
              userId: input.userId,
              eventId: invitation.eventId,
              roleId: invitation.roleId,
            },
          },
        });

        if (!existingRole) {
          // Create the user role assignment
          await ctx.db.userRole.create({
            data: {
              userId: input.userId,
              eventId: invitation.eventId,
              roleId: invitation.roleId,
            },
          });

          acceptedRoles.push({
            eventName: invitation.event.name,
            roleName: invitation.role.name,
          });
        }

        // Mark invitation as accepted
        await ctx.db.invitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        });
      }

      return {
        accepted: acceptedRoles.length,
        roles: acceptedRoles,
      };
    }),

  // Cancel invitation
  cancel: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const invitation = await ctx.db.invitation.findUnique({
        where: { id: input.invitationId },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      if (invitation.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending invitations can be cancelled",
        });
      }

      const updatedInvitation = await ctx.db.invitation.update({
        where: { id: input.invitationId },
        data: { status: "CANCELLED" },
        include: {
          event: true,
          role: true,
        },
      });

      return updatedInvitation;
    }),

  // Resend invitation (updates expiration and sends new email)
  resend: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const invitation = await ctx.db.invitation.findUnique({
        where: { id: input.invitationId },
        include: {
          event: true,
          role: true,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      if (invitation.status === "ACCEPTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot resend an accepted invitation",
        });
      }

      // Extend expiration by 30 days
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);

      const updatedInvitation = await ctx.db.invitation.update({
        where: { id: input.invitationId },
        data: {
          status: "PENDING",
          expiresAt: newExpiry,
        },
        include: {
          event: true,
          role: true,
        },
      });

      // Resend invitation email
      try {
        await sendInvitationEmail({
          email: updatedInvitation.email,
          eventName: updatedInvitation.event.name,
          eventDescription: updatedInvitation.event.description ?? "Join us for this exciting event!",
          roleName: updatedInvitation.role.name,
          inviterName: ctx.session.user.name ?? "Event Admin",
          invitationToken: updatedInvitation.token,
          expiresAt: updatedInvitation.expiresAt,
        });
      } catch (error) {
        console.error("Failed to resend invitation email:", error);
        // Don't throw error - invitation was updated, email failure is not critical
      }

      return updatedInvitation;
    }),

  // Get invitation statistics
  getStats: protectedProcedure
    .input(z.object({
      eventId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const where = input.eventId ? { eventId: input.eventId } : {};

      const [pending, accepted, expired, cancelled, total] = await Promise.all([
        ctx.db.invitation.count({ where: { ...where, status: "PENDING" } }),
        ctx.db.invitation.count({ where: { ...where, status: "ACCEPTED" } }),
        ctx.db.invitation.count({ where: { ...where, status: "EXPIRED" } }),
        ctx.db.invitation.count({ where: { ...where, status: "CANCELLED" } }),
        ctx.db.invitation.count({ where }),
      ]);

      return {
        total,
        pending,
        accepted,
        expired,
        cancelled,
        acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
      };
    }),

  // Get available roles for invitations
  getAvailableRoles: publicProcedure.query(async ({ ctx }) => {
    const roles = await ctx.db.role.findMany({
      orderBy: { name: "asc" },
    });
    return roles;
  }),

  // Expire old invitations (utility function)
  expireOldInvitations: protectedProcedure.mutation(async ({ ctx }) => {
    checkAdminAccess(ctx.session.user.role);

    const expired = await ctx.db.invitation.updateMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: "EXPIRED",
      },
    });

    return { expiredCount: expired.count };
  }),
});