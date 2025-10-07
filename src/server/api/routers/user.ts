import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { hashPassword } from "~/utils/password";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A user with this email already exists",
        });
      }

      // Hash the password
      const hashedPassword = await hashPassword(input.password);

      // Create the user
      const user = await ctx.db.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      return user;
    }),

  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      // Only allow staff and admin users to fetch all users
      if (ctx.session.user.role !== "staff" && ctx.session.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only staff and admin users can access user list",
        });
      }

      const users = await ctx.db.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return users;
    }),

  getAdmins: protectedProcedure
    .query(async ({ ctx }) => {
      // Only allow staff and admin users to fetch admin users
      if (ctx.session.user.role !== "staff" && ctx.session.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only staff and admin users can access admin user list",
        });
      }

      const adminUsers = await ctx.db.user.findMany({
        where: {
          role: "admin",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isAIReviewer: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return adminUsers;
    }),

  updateUserAdminNotes: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        adminNotes: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow admin users to update admin notes
      if (ctx.session.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admin users can update user admin notes",
        });
      }

      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          adminNotes: input.adminNotes,
          adminUpdatedBy: ctx.session.user.id,
          adminUpdatedAt: new Date(),
        },
        select: {
          id: true,
          adminNotes: true,
          adminUpdatedAt: true,
        },
      });

      return user;
    }),

  updateUserAdminLabels: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        adminLabels: z.array(z.enum(["AI / ML expert", "Designer", "Developer", "Entrepreneur", "Lawyer", "Non-Technical", "Project manager", "REFI", "Regen", "Researcher", "Scientist", "Woman", "Writer", "ZK"])),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow admin users to update admin labels
      if (ctx.session.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admin users can update user admin labels",
        });
      }

      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          adminLabels: input.adminLabels,
          adminUpdatedBy: ctx.session.user.id,
          adminUpdatedAt: new Date(),
        },
        select: {
          id: true,
          adminLabels: true,
          adminUpdatedAt: true,
        },
      });

      return user;
    }),

  updateUserAdminWorkExperience: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        adminWorkExperience: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow admin users to update admin work experience
      if (ctx.session.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admin users can update user admin work experience",
        });
      }

      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          adminWorkExperience: input.adminWorkExperience,
          adminUpdatedBy: ctx.session.user.id,
          adminUpdatedAt: new Date(),
        },
        select: {
          id: true,
          adminWorkExperience: true,
          adminUpdatedAt: true,
        },
      });

      return user;
    }),
});
