import type { Prisma } from "@prisma/client";

import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Input validation schemas
const profileUpdateSchema = z.object({
  bio: z.string().max(1000).optional(),
  jobTitle: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  skills: z.array(z.string().max(50)).max(20).optional(),
  interests: z.array(z.string().max(50)).max(20).optional(),
  availableForMentoring: z.boolean().optional(),
  availableForHiring: z.boolean().optional(),
  availableForOfficeHours: z.boolean().optional(),
  timezone: z.string().max(50).optional(),
  languages: z.array(z.string().max(50)).max(10).optional(),
  yearsOfExperience: z.number().min(0).max(50).optional(),
  telegramHandle: z.string().max(100).optional(),
  discordHandle: z.string().max(100).optional(),
});

const projectCreateSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  githubUrl: z.string().url().optional(),
  liveUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  technologies: z.array(z.string().max(30)).max(20),
  featured: z.boolean().optional().default(false),
});

const projectUpdateSchema = projectCreateSchema.partial().extend({
  id: z.string(),
});

const profileSearchSchema = z.object({
  search: z.string().optional(),
  skills: z.array(z.string()).optional(),
  location: z.string().optional(),
  availableForMentoring: z.boolean().optional(),
  availableForHiring: z.boolean().optional(),
  availableForOfficeHours: z.boolean().optional(),
  limit: z.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export const profileRouter = createTRPCRouter({
  // Get current user's profile
  getMyProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const profile = await ctx.db.userProfile.findUnique({
        where: { userId: ctx.session.user.id },
        include: {
          projects: {
            orderBy: [
              { featured: "desc" },
              { order: "asc" },
              { createdAt: "desc" },
            ],
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      return profile;
    }),

  // Get any user's profile by ID (public)
  getProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.userProfile.findUnique({
        where: { userId: input.userId },
        include: {
          projects: {
            orderBy: [
              { featured: "desc" },
              { order: "asc" },
              { createdAt: "desc" },
            ],
          },
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      if (!profile) {
        // Return basic user info even if no profile exists
        const user = await ctx.db.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            name: true,
            image: true,
          },
        });
        
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }
        
        return {
          user,
          id: null,
          bio: null,
          jobTitle: null,
          company: null,
          location: null,
          website: null,
          githubUrl: null,
          linkedinUrl: null,
          twitterUrl: null,
          skills: [],
          interests: [],
          availableForMentoring: false,
          availableForHiring: false,
          availableForOfficeHours: false,
          timezone: null,
          languages: [],
          yearsOfExperience: null,
          telegramHandle: null,
          discordHandle: null,
          projects: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: input.userId
        };      }

      return profile;
    }),

  // Update current user's profile
  updateProfile: protectedProcedure
    .input(profileUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.userProfile.upsert({
        where: { userId: ctx.session.user.id },
        create: {
          userId: ctx.session.user.id,
          ...input,
        },
        update: input,
        include: {
          projects: {
            orderBy: [
              { featured: "desc" },
              { order: "asc" },
              { createdAt: "desc" },
            ],
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      return profile;
    }),

  // Search profiles with filters
  searchProfiles: publicProcedure
    .input(profileSearchSchema)
    .query(async ({ ctx, input }) => {
      const {
        search,
        skills,
        location,
        availableForMentoring,
        availableForHiring,
        availableForOfficeHours,
        limit,
        cursor,
      } = input;

      const where: Prisma.UserProfileWhereInput = {};

      // Text search across multiple fields
      if (search) {
        where.OR = [
          { user: { name: { contains: search, mode: "insensitive" } } },
          { bio: { contains: search, mode: "insensitive" } },
          { jobTitle: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
          { skills: { hasSome: [search] } },
        ];
      }

      // Skills filter
      if (skills && skills.length > 0) {
        where.skills = { hasSome: skills };
      }

      // Location filter
      if (location) {
        where.location = { contains: location, mode: "insensitive" };
      }

      // Availability filters
      if (availableForMentoring !== undefined) {
        where.availableForMentoring = availableForMentoring;
      }
      if (availableForHiring !== undefined) {
        where.availableForHiring = availableForHiring;
      }
      if (availableForOfficeHours !== undefined) {
        where.availableForOfficeHours = availableForOfficeHours;
      }

      const profiles = await ctx.db.userProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          projects: {
            where: { featured: true },
            take: 3,
            orderBy: { order: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: limit + 1, // Take one extra to determine if there's a next page
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      let nextCursor: string | undefined = undefined;
      if (profiles.length > limit) {
        const nextItem = profiles.pop();
        nextCursor = nextItem!.id;
      }

      return {
        profiles,
        nextCursor,
      };
    }),

  // Get all users for directory (with basic info even without profiles)
  getAllMembers: publicProcedure
    .input(profileSearchSchema)
    .query(async ({ ctx, input }) => {
      const {
        search,
        skills,
        location,
        availableForMentoring,
        availableForHiring,
        availableForOfficeHours,
        limit,
        cursor,
      } = input;

      const profileWhere: Prisma.UserProfileWhereInput = {};
      const userWhere: Prisma.UserWhereInput = {};

      // Text search
      if (search) {
        userWhere.OR = [
          { name: { contains: search, mode: "insensitive" } },
        ];
        profileWhere.OR = [
          { bio: { contains: search, mode: "insensitive" } },
          { jobTitle: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
          { skills: { hasSome: [search] } },
        ];
      }

      // Profile-specific filters
      if (skills && skills.length > 0) {
        profileWhere.skills = { hasSome: skills };
      }
      if (location) {
        profileWhere.location = { contains: location, mode: "insensitive" };
      }
      if (availableForMentoring !== undefined) {
        profileWhere.availableForMentoring = availableForMentoring;
      }
      if (availableForHiring !== undefined) {
        profileWhere.availableForHiring = availableForHiring;
      }
      if (availableForOfficeHours !== undefined) {
        profileWhere.availableForOfficeHours = availableForOfficeHours;
      }

      const users = await ctx.db.user.findMany({
        where: {
          ...userWhere,
          ...(Object.keys(profileWhere).length > 0 ? {
            profile: profileWhere
          } : {}),
        },
        include: {
          profile: {
            include: {
              projects: {
                where: { featured: true },
                take: 3,
                orderBy: { order: "asc" },
              },
            },
          },
        },
        orderBy: { name: "asc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      let nextCursor: string | undefined = undefined;
      if (users.length > limit) {
        const nextItem = users.pop();
        nextCursor = nextItem!.id;
      }

      return {
        members: users,
        nextCursor,
      };
    }),

  // Project management
  createProject: protectedProcedure
    .input(projectCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Get or create user profile
      let profile = await ctx.db.userProfile.findUnique({
        where: { userId: ctx.session.user.id },
      });

      profile ??= await ctx.db.userProfile.create({
        data: { userId: ctx.session.user.id },
      });
      // Get the next order value
      const lastProject = await ctx.db.userProject.findFirst({
        where: { profileId: profile.id },
        orderBy: { order: "desc" },
      });

      const project = await ctx.db.userProject.create({
        data: {
          ...input,
          profileId: profile.id,
          order: (lastProject?.order ?? -1) + 1,
        },
      });

      return project;
    }),

  updateProject: protectedProcedure
    .input(projectUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Verify ownership
      const project = await ctx.db.userProject.findUnique({
        where: { id },
        include: { profile: true },
      });

      if (!project || project.profile.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own projects",
        });
      }

      const updatedProject = await ctx.db.userProject.update({
        where: { id },
        data: updateData,
      });

      return updatedProject;
    }),

  deleteProject: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const project = await ctx.db.userProject.findUnique({
        where: { id: input.id },
        include: { profile: true },
      });

      if (!project || project.profile.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own projects",
        });
      }

      await ctx.db.userProject.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Reorder projects
  reorderProjects: protectedProcedure
    .input(z.object({
      projectIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get user's profile
      const profile = await ctx.db.userProfile.findUnique({
        where: { userId: ctx.session.user.id },
        include: { projects: true },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      // Verify all projects belong to the user
      const userProjectIds = profile.projects.map(p => p.id);
      const invalidIds = input.projectIds.filter(id => !userProjectIds.includes(id));
      
      if (invalidIds.length > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only reorder your own projects",
        });
      }

      // Update order for each project
      const updatePromises = input.projectIds.map((id, index) =>
        ctx.db.userProject.update({
          where: { id },
          data: { order: index },
        })
      );

      await Promise.all(updatePromises);

      return { success: true };
    }),

  // Get profile statistics
  getProfileStats: publicProcedure
    .query(async ({ ctx }) => {
      const stats = await ctx.db.userProfile.aggregate({
        _count: {
          id: true,
        },
      });

      const availableStats = await ctx.db.userProfile.groupBy({
        by: ['availableForMentoring', 'availableForHiring', 'availableForOfficeHours'],
        _count: true,
      });

      return {
        totalProfiles: stats._count.id,
        availabilityStats: availableStats,
      };
    }),
});