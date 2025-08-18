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
});