import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

export const roleRouter = createTRPCRouter({
  // Get all global roles
  getGlobalRoles: publicProcedure.query(async ({ ctx }) => {
    const roles = await ctx.db.globalRole.findMany({
      include: {
        userGlobalRoles: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
    return roles;
  }),

  // Get a user's global roles
  getUserGlobalRoles: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userRoles = await ctx.db.userGlobalRole.findMany({
        where: { userId: input.userId },
        include: {
          globalRole: true,
        },
      });
      return userRoles.map(ur => ur.globalRole);
    }),

  // Get current user's global roles
  getMyGlobalRoles: protectedProcedure.query(async ({ ctx }) => {
    const userRoles = await ctx.db.userGlobalRole.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        globalRole: true,
      },
    });
    return userRoles.map(ur => ur.globalRole);
  }),

  // Check if user has specific permission
  hasPermission: protectedProcedure
    .input(z.object({ permission: z.string() }))
    .query(async ({ ctx, input }) => {
      const userRoles = await ctx.db.userGlobalRole.findMany({
        where: { userId: ctx.session.user.id },
        include: {
          globalRole: true,
        },
      });

      // Check if any of the user's roles has the required permission
      return userRoles.some(ur => 
        ur.globalRole.permissions.includes(input.permission)
      );
    }),

  // Create a new global role (admin only)
  createGlobalRole: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      permissions: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Add admin check here once we implement it
      const role = await ctx.db.globalRole.create({
        data: {
          name: input.name,
          description: input.description,
          permissions: input.permissions,
        },
      });
      return role;
    }),

  // Assign role to user (admin only)
  assignGlobalRole: protectedProcedure
    .input(z.object({
      userId: z.string(),
      globalRoleId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Add admin check here once we implement it
      
      // Check if assignment already exists
      const existing = await ctx.db.userGlobalRole.findUnique({
        where: {
          userId_globalRoleId: {
            userId: input.userId,
            globalRoleId: input.globalRoleId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already has this role",
        });
      }

      const userRole = await ctx.db.userGlobalRole.create({
        data: {
          userId: input.userId,
          globalRoleId: input.globalRoleId,
          assignedBy: ctx.session.user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          globalRole: true,
        },
      });
      return userRole;
    }),

  // Remove role from user (admin only)
  removeGlobalRole: protectedProcedure
    .input(z.object({
      userId: z.string(),
      globalRoleId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Add admin check here once we implement it
      
      const deleted = await ctx.db.userGlobalRole.deleteMany({
        where: {
          userId: input.userId,
          globalRoleId: input.globalRoleId,
        },
      });

      if (deleted.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User role assignment not found",
        });
      }

      return { success: true };
    }),

  // Get all users with their global roles (admin only)
  getUsersWithRoles: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Add admin check here once we implement it
    
    const users = await ctx.db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        userGlobalRoles: {
          include: {
            globalRole: true,
          },
        },
      },
    });

    return users.map(user => ({
      ...user,
      globalRoles: user.userGlobalRoles.map(ur => ur.globalRole),
    }));
  }),

  // Get all users with their event roles and applications
  getAllUsersWithEventRoles: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      eventId: z.string().optional(),
      roleId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // TODO: Add admin check here once we implement it
      
      const users = await ctx.db.user.findMany({
        where: {
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { email: { contains: input.search, mode: "insensitive" } },
            ],
          }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          emailVerified: true,
          userRoles: {
            where: {
              ...(input.eventId && { eventId: input.eventId }),
              ...(input.roleId && { roleId: input.roleId }),
            },
            include: {
              event: {
                select: {
                  id: true,
                  name: true,
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          applications: {
            include: {
              event: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              userRoles: true,
              applications: true,
            },
          },
        },
        orderBy: [
          { role: "desc" }, // Admins first, then staff, then users
          { name: "asc" },
        ],
      });

      return users;
    }),

  // Assign event role to existing user
  assignEventRole: protectedProcedure
    .input(z.object({
      userId: z.string(),
      eventId: z.string(),
      roleId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Add admin check here once we implement it
      
      // Check if assignment already exists
      const existing = await ctx.db.userRole.findUnique({
        where: {
          userId_eventId_roleId: {
            userId: input.userId,
            eventId: input.eventId,
            roleId: input.roleId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already has this role for this event",
        });
      }

      // Verify user, event, and role exist
      const [user, event, role] = await Promise.all([
        ctx.db.user.findUnique({ where: { id: input.userId } }),
        ctx.db.event.findUnique({ where: { id: input.eventId } }),
        ctx.db.role.findUnique({ where: { id: input.roleId } }),
      ]);

      if (!user || !event || !role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User, event, or role not found",
        });
      }

      const userRole = await ctx.db.userRole.create({
        data: {
          userId: input.userId,
          eventId: input.eventId,
          roleId: input.roleId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          event: {
            select: {
              id: true,
              name: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return userRole;
    }),

  // Remove event role from user
  removeEventRole: protectedProcedure
    .input(z.object({
      userId: z.string(),
      eventId: z.string(),
      roleId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Add admin check here once we implement it
      
      const deleted = await ctx.db.userRole.deleteMany({
        where: {
          userId: input.userId,
          eventId: input.eventId,
          roleId: input.roleId,
        },
      });

      if (deleted.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User role assignment not found",
        });
      }

      return { success: true };
    }),

  // Update user's global role (admin -> staff -> user)
  updateUserGlobalRole: protectedProcedure
    .input(z.object({
      userId: z.string(),
      newRole: z.enum(["user", "staff", "admin"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Add admin check here once we implement it
      
      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.newRole },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      return user;
    }),

  // Get user details with all roles and applications
  getUserDetails: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // TODO: Add admin check here once we implement it
      
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        include: {
          userRoles: {
            include: {
              event: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  startDate: true,
                  endDate: true,
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          applications: {
            include: {
              event: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          userGlobalRoles: {
            include: {
              globalRole: true,
            },
          },
          _count: {
            select: {
              userRoles: true,
              applications: true,
              posts: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

  // Get user statistics
  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Add admin check here once we implement it
    
    const [totalUsers, adminCount, staffCount, usersWithRoles] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.user.count({ where: { role: "admin" } }),
      ctx.db.user.count({ where: { role: "staff" } }),
      ctx.db.user.count({
        where: {
          userRoles: {
            some: {},
          },
        },
      }),
    ]);

    return {
      total: totalUsers,
      admins: adminCount,
      staff: staffCount,
      users: totalUsers - adminCount - staffCount,
      usersWithEventRoles: usersWithRoles,
    };
  }),
});