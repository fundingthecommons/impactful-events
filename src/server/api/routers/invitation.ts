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
  type: z.enum(["EVENT_ROLE", "GLOBAL_ADMIN", "GLOBAL_STAFF"]).default("EVENT_ROLE"),
  eventId: z.string().optional(),
  roleId: z.string().optional(),
  globalRole: z.enum(["admin", "staff"]).optional(),
  expiresAt: z.date().optional(),
}).refine((data) => {
  // For EVENT_ROLE type, eventId and roleId are required
  if (data.type === "EVENT_ROLE") {
    return data.eventId && data.roleId;
  }
  // For GLOBAL_ADMIN/GLOBAL_STAFF, globalRole is required
  if (data.type === "GLOBAL_ADMIN" || data.type === "GLOBAL_STAFF") {
    return data.globalRole;
  }
  return true;
}, {
  message: "Missing required fields for invitation type",
});

const BulkCreateInvitationSchema = z.object({
  emails: z.array(z.string().email()),
  type: z.enum(["EVENT_ROLE", "GLOBAL_ADMIN", "GLOBAL_STAFF"]).default("EVENT_ROLE"),
  eventId: z.string().optional(),
  roleId: z.string().optional(),
  globalRole: z.enum(["admin", "staff"]).optional(),
  expiresAt: z.date().optional(),
}).refine((data) => {
  // Same validation as CreateInvitationSchema
  if (data.type === "EVENT_ROLE") {
    return data.eventId && data.roleId;
  }
  if (data.type === "GLOBAL_ADMIN" || data.type === "GLOBAL_STAFF") {
    return data.globalRole;
  }
  return true;
}, {
  message: "Missing required fields for invitation type",
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
      let existing;
      if (input.type === "EVENT_ROLE") {
        existing = await ctx.db.invitation.findFirst({
          where: {
            email: input.email,
            eventId: input.eventId,
            roleId: input.roleId,
            status: "PENDING",
          },
        });
      } else {
        existing = await ctx.db.invitation.findFirst({
          where: {
            email: input.email,
            type: input.type,
            globalRole: input.globalRole,
            status: "PENDING",
          },
        });
      }

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation already exists for this email and role combination",
        });
      }

      let event = null;
      let role = null;

      // Verify event and role exist for event-specific invitations
      if (input.type === "EVENT_ROLE") {
        event = await ctx.db.event.findUnique({
          where: { id: input.eventId! },
        });

        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        role = await ctx.db.role.findUnique({
          where: { id: input.roleId! },
        });

        if (!role) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Role not found",
          });
        }
      }

      // Set default expiration to 30 days from now
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 30);

      const invitation = await ctx.db.invitation.create({
        data: {
          email: input.email,
          type: input.type,
          eventId: input.eventId,
          roleId: input.roleId,
          globalRole: input.globalRole,
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
        if (input.type === "EVENT_ROLE") {
          await sendInvitationEmail({
            email: invitation.email,
            eventName: invitation.event!.name,
            eventDescription: invitation.event!.description ?? "Join us for this exciting event!",
            roleName: invitation.role!.name,
            inviterName: ctx.session.user.name ?? "Event Admin",
            invitationToken: invitation.token,
            expiresAt: invitation.expiresAt,
            eventId: invitation.eventId ?? undefined,
          });
        } else {
          // Send global admin invitation email
          await sendInvitationEmail({
            email: invitation.email,
            eventName: "Platform Administration",
            eventDescription: `You've been invited to join as a ${invitation.globalRole} administrator for the entire platform.`,
            roleName: invitation.globalRole ?? "Administrator",
            inviterName: ctx.session.user.name ?? "Platform Admin",
            invitationToken: invitation.token,
            expiresAt: invitation.expiresAt,
            isGlobalRole: true,
            globalRole: invitation.globalRole ?? undefined,
          });
        }
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
        type: input.type,
        eventId: input.eventId ?? undefined,
        roleId: input.roleId ?? undefined,
        globalRole: input.globalRole ?? undefined,
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
          if (invitation.type === "EVENT_ROLE") {
            await sendInvitationEmail({
              email: invitation.email,
              eventName: invitation.event?.name ?? "Event",
              eventDescription: invitation.event?.description ?? "Join us for this exciting event!",
              roleName: invitation.role?.name ?? "Participant",
              inviterName: ctx.session.user.name ?? "Event Admin",
              invitationToken: invitation.token,
              expiresAt: invitation.expiresAt,
              eventId: invitation.eventId ?? undefined,
            });
          } else {
            await sendInvitationEmail({
              email: invitation.email,
              eventName: "Platform Administration",
              eventDescription: `You've been invited to join as a ${invitation.globalRole} administrator for the entire platform.`,
              roleName: invitation.globalRole ?? "Administrator",
              inviterName: ctx.session.user.name ?? "Platform Admin",
              invitationToken: invitation.token,
              expiresAt: invitation.expiresAt,
              isGlobalRole: true,
              globalRole: invitation.globalRole ?? undefined,
            });
          }
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
      userId: z.string().optional(), // Make userId optional for sign-in flow
    }))
    .mutation(async ({ ctx, input }) => {
      let userId = input.userId;
      
      // If userId not provided, look up user by email (for sign-in flow)
      if (!userId) {
        const user = await ctx.db.user.findUnique({
          where: { email: input.email },
          select: { id: true }
        });
        
        if (!user) {
          return { accepted: 0, roles: [], error: "User not found" };
        }
        
        userId = user.id;
      }

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
        if (invitation.type === "EVENT_ROLE" && invitation.eventId && invitation.roleId) {
          // Check if user already has this role for this event
          const existingRole = await ctx.db.userRole.findUnique({
            where: {
              userId_eventId_roleId: {
                userId: userId,
                eventId: invitation.eventId,
                roleId: invitation.roleId,
              },
            },
          });

          if (!existingRole) {
            // Create the user role assignment
            await ctx.db.userRole.create({
              data: {
                userId: userId,
                eventId: invitation.eventId,
                roleId: invitation.roleId,
              },
            });

            acceptedRoles.push({
              eventName: invitation.event?.name ?? "Event",
              roleName: invitation.role?.name ?? "Role",
            });
          }
        } else if ((invitation.type === "GLOBAL_ADMIN" || invitation.type === "GLOBAL_STAFF") && invitation.globalRole) {
          // Update user's global role
          await ctx.db.user.update({
            where: { id: userId },
            data: { role: invitation.globalRole },
          });

          acceptedRoles.push({
            eventName: "Global Platform",
            roleName: invitation.globalRole,
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
        if (updatedInvitation.type === "EVENT_ROLE") {
          await sendInvitationEmail({
            email: updatedInvitation.email,
            eventName: updatedInvitation.event?.name ?? "Event",
            eventDescription: updatedInvitation.event?.description ?? "Join us for this exciting event!",
            roleName: updatedInvitation.role?.name ?? "Participant",
            inviterName: ctx.session.user.name ?? "Event Admin",
            invitationToken: updatedInvitation.token,
            expiresAt: updatedInvitation.expiresAt,
            eventId: updatedInvitation.eventId ?? undefined,
          });
        } else {
          await sendInvitationEmail({
            email: updatedInvitation.email,
            eventName: "Platform Administration",
            eventDescription: `You've been invited to join as a ${updatedInvitation.globalRole} administrator for the entire platform.`,
            roleName: updatedInvitation.globalRole ?? "Administrator",
            inviterName: ctx.session.user.name ?? "Platform Admin",
            invitationToken: updatedInvitation.token,
            expiresAt: updatedInvitation.expiresAt,
            isGlobalRole: true,
            globalRole: updatedInvitation.globalRole ?? undefined,
          });
        }
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