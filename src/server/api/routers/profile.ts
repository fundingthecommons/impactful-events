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
  isPublic: z.boolean().optional(),
  timezone: z.string().max(50).optional(),
  languages: z.array(z.string().max(50)).max(10).optional(),
  yearsOfExperience: z.number().min(0).max(50).optional(),
  telegramHandle: z.string().max(100).optional(),
  discordHandle: z.string().max(100).optional(),
  // Profile image
  avatarUrl: z.string().url().optional().or(z.literal("")),
  // Mentor-specific fields
  phoneNumber: z.string().max(50).optional(),
  mentorshipStyle: z.string().max(1000).optional(),
  previousMentoringExp: z.string().max(1000).optional(),
  mentorSpecializations: z.array(z.string().max(50)).max(20).optional(),
  mentorGoals: z.string().max(1000).optional(),
  mentorAvailableDates: z.array(z.string().max(50)).max(10).optional(),
  mentorHoursPerWeek: z.string().max(50).optional(),
  mentorPreferredContact: z.string().max(50).optional(),
});

const projectCreateSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  githubUrl: z.string().url().optional(),
  liveUrl: z.string().url().optional(),
  imageUrl: z.string().optional(), // Project logo
  bannerUrl: z.string().optional(), // Project banner
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

const projectsSearchSchema = z.object({
  search: z.string().optional(),
  technologies: z.array(z.string()).optional(),
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

      if (!profile) {
        return profile;
      }

      // Also get projects where user is a collaborator
      const collaboratorProjects = await ctx.db.userProject.findMany({
        where: {
          collaborators: {
            some: {
              userId: ctx.session.user.id,
            },
          },
        },
        orderBy: [
          { featured: "desc" },
          { order: "asc" },
          { createdAt: "desc" },
        ],
      });

      // Merge owned projects and collaborator projects
      const allProjects = [...profile.projects, ...collaboratorProjects];

      // Remove duplicates and sort
      const uniqueProjects = Array.from(
        new Map(allProjects.map(p => [p.id, p])).values()
      ).sort((a, b) => {
        // Sort by featured first
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        // Then by order
        if (a.order !== b.order) return a.order - b.order;
        // Finally by creation date
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      return {
        ...profile,
        projects: uniqueProjects,
      };
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
          isPublic: true,
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

      // Text search across multiple fields
      if (search) {
        userWhere.OR = [
          { name: { contains: search, mode: "insensitive" } },
          // Search in UserSkills (normalized skills)
          {
            userSkills: {
              some: {
                skill: {
                  name: { contains: search, mode: "insensitive" }
                }
              }
            }
          },
        ];
        profileWhere.OR = [
          { bio: { contains: search, mode: "insensitive" } },
          { jobTitle: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
          { skills: { hasSome: [search] } }, // Legacy skills
          { priorExperience: { contains: search, mode: "insensitive" } }, // New field
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
          userSkills: {
            include: {
              skill: true,
            },
            orderBy: {
              experienceLevel: "desc",
            },
            take: 10, // Top 10 skills per user
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

      // Verify ownership OR collaborator with edit permission
      const project = await ctx.db.userProject.findUnique({
        where: { id },
        include: {
          profile: true,
          collaborators: {
            where: {
              userId: ctx.session.user.id,
              canEdit: true,
            },
          },
        },
      });

      const isOwner = project?.profile.userId === ctx.session.user.id;
      const isCollaborator = (project?.collaborators.length ?? 0) > 0;

      if (!project || (!isOwner && !isCollaborator)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update projects you own or collaborate on",
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

  // Add collaborators to a project (owner only)
  addProjectCollaborators: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      userIds: z.array(z.string()).min(1, "At least one collaborator is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the project
      const project = await ctx.db.userProject.findUnique({
        where: { id: input.projectId },
        include: { profile: true },
      });

      if (!project || project.profile.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only add collaborators to your own projects",
        });
      }

      // Filter out owner from collaborators
      const validUserIds = input.userIds.filter(id => id !== ctx.session.user.id);

      if (validUserIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot add yourself as a collaborator",
        });
      }

      // Create collaborator records
      await ctx.db.projectCollaborator.createMany({
        data: validUserIds.map(userId => ({
          projectId: input.projectId,
          userId,
        })),
        skipDuplicates: true, // Ignore if already exists
      });

      return { success: true, addedCount: validUserIds.length };
    }),

  // Remove a collaborator from a project (owner only)
  removeProjectCollaborator: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the project
      const project = await ctx.db.userProject.findUnique({
        where: { id: input.projectId },
        include: { profile: true },
      });

      if (!project || project.profile.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only remove collaborators from your own projects",
        });
      }

      // Delete the collaborator
      await ctx.db.projectCollaborator.deleteMany({
        where: {
          projectId: input.projectId,
          userId: input.userId,
        },
      });

      return { success: true };
    }),

  // Get project collaborators
  getProjectCollaborators: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.userProject.findUnique({
        where: { id: input.projectId },
        include: {
          profile: true,
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            orderBy: { addedAt: "desc" },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Check if user is owner or collaborator
      const isOwner = project.profile.userId === ctx.session.user.id;
      const isCollaborator = project.collaborators.some(
        (c) => c.userId === ctx.session.user.id,
      );

      if (!isOwner && !isCollaborator) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view collaborators for projects you own or collaborate on",
        });
      }

      return {
        ownerId: project.profile.userId,
        collaborators: project.collaborators,
      };
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

  // Get all featured projects
  getAllFeaturedProjects: publicProcedure
    .input(projectsSearchSchema)
    .query(async ({ ctx, input }) => {
      const {
        search,
        technologies,
        limit,
        cursor,
      } = input;

      const where: Prisma.UserProjectWhereInput = {
        featured: true,
      };

      // Text search across project fields
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { technologies: { hasSome: [search] } },
        ];
      }

      // Technologies filter
      if (technologies && technologies.length > 0) {
        where.technologies = { hasSome: technologies };
      }

      const projects = await ctx.db.userProject.findMany({
        where,
        include: {
          profile: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: [
          { featured: "desc" },
          { order: "asc" },
          { createdAt: "desc" },
        ],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      let nextCursor: string | undefined = undefined;
      if (projects.length > limit) {
        const nextItem = projects.pop();
        nextCursor = nextItem!.id;
      }

      return {
        projects,
        nextCursor,
      };
    }),

  // Calculate profile completion percentage
  getProfileCompletion: protectedProcedure
    .query(async ({ ctx }) => {
      const profile = await ctx.db.userProfile.findUnique({
        where: { userId: ctx.session.user.id },
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      });

      const user = ctx.session.user;
      
      const fields = {
        name: !!user.name,
        image: !!user.image,
        bio: !!profile?.bio,
        jobTitle: !!profile?.jobTitle,
        company: !!profile?.company,
        location: !!profile?.location,
        skills: !!profile?.skills && profile.skills.length > 0,
        githubUrl: !!profile?.githubUrl,
        linkedinUrl: !!profile?.linkedinUrl,
        website: !!profile?.website,
      };

      const completedFields = Object.values(fields).filter(Boolean).length;
      const totalFields = Object.keys(fields).length;
      const percentage = Math.round((completedFields / totalFields) * 100);

      const missingFields = Object.entries(fields)
        .filter(([_, completed]) => !completed)
        .map(([field]) => field);

      return {
        percentage,
        completedFields,
        totalFields,
        fields,
        missingFields,
        meetsThreshold: percentage >= 70, // 70% threshold for directory visibility
      };
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

  // Check if mentor has completed their profile
  checkMentorCompletion: protectedProcedure
    .query(async ({ ctx }) => {
      const profile = await ctx.db.userProfile.findUnique({
        where: { userId: ctx.session.user.id },
        select: {
          mentorSpecializations: true,
          mentorGoals: true,
          mentorAvailableDates: true,
          mentorHoursPerWeek: true,
          mentorPreferredContact: true,
          mentorshipStyle: true,
        },
      });

      if (!profile) {
        return { isComplete: false };
      }

      // Check if key mentor fields are filled
      const isComplete = !!(
        profile.mentorSpecializations?.length &&
        profile.mentorGoals?.trim() &&
        profile.mentorAvailableDates?.length &&
        profile.mentorHoursPerWeek?.trim() &&
        profile.mentorPreferredContact?.trim() &&
        profile.mentorshipStyle?.trim()
      );

      return { isComplete };
    }),

  // Profile-Application Sync endpoints
  getUserApplicationsForSync: protectedProcedure
    .query(async ({ ctx }) => {
      const applications = await ctx.db.application.findMany({
        where: { 
          userId: ctx.session.user.id,
          status: { in: ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED"] }, // All submitted applications
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
            },
          },
          responses: {
            include: {
              question: {
                select: {
                  id: true,
                  questionKey: true,
                  questionEn: true,
                },
              },
            },
          },
          profileSyncs: {
            select: {
              id: true,
              syncedFields: true,
              syncedAt: true,
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      });

      return applications;
    }),

  previewApplicationSync: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const application = await ctx.db.application.findUnique({
        where: { 
          id: input.applicationId,
          userId: ctx.session.user.id,
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
            },
          },
          responses: {
            include: {
              question: {
                select: {
                  questionKey: true,
                  questionEn: true,
                },
              },
            },
          },
          profileSyncs: {
            select: {
              id: true,
              syncedFields: true,
              syncedAt: true,
            },
          },
        },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND", 
          message: "Application not found",
        });
      }

      // Get current profile
      const currentProfile = await ctx.db.userProfile.findUnique({
        where: { userId: ctx.session.user.id },
      });

      // Map application responses to profile fields
      const responseMap = new Map(
        application.responses.map(r => [r.question.questionKey, r.answer])
      );

      const syncableData: Record<string, { 
        source: 'application' | 'profile' | 'merged',
        applicationValue?: string | string[],
        profileValue?: string | string[] | boolean | number | null,
        willSync: boolean,
        reason?: string,
      }> = {};

      // Technical skills mapping
      if (responseMap.has("technical_skills")) {
        try {
          const appSkills = JSON.parse(responseMap.get("technical_skills")!) as string[];
          const profileSkills = currentProfile?.skills ?? [];
          syncableData.skills = {
            source: profileSkills.length === 0 ? 'application' : 'merged',
            applicationValue: appSkills,
            profileValue: profileSkills,
            willSync: appSkills.length > 0,
            reason: profileSkills.length > 0 ? 'Will merge with existing skills' : 'Will add from application'
          };
        } catch {
          // Skip if JSON parsing fails
        }
      }

      // Bio mapping
      if (responseMap.has("bio")) {
        const appBio = responseMap.get("bio")!;
        syncableData.bio = {
          source: 'application',
          applicationValue: appBio,
          profileValue: currentProfile?.bio,
          willSync: !currentProfile?.bio && appBio.trim().length > 0,
          reason: currentProfile?.bio ? 'Profile bio already exists' : 'Will add from application'
        };
      }

      // Location mapping
      if (responseMap.has("location")) {
        const appLocation = responseMap.get("location")!;
        syncableData.location = {
          source: 'application',
          applicationValue: appLocation,
          profileValue: currentProfile?.location,
          willSync: !currentProfile?.location && appLocation.trim().length > 0,
          reason: currentProfile?.location ? 'Profile location already exists' : 'Will add from application'
        };
      }

      // Company mapping
      if (responseMap.has("company")) {
        const appCompany = responseMap.get("company")!;
        syncableData.company = {
          source: 'application',
          applicationValue: appCompany,
          profileValue: currentProfile?.company,
          willSync: !currentProfile?.company && appCompany.trim().length > 0,
          reason: currentProfile?.company ? 'Profile company already exists' : 'Will add from application'
        };
      }

      // LinkedIn URL mapping
      if (responseMap.has("linkedin_url")) {
        const appLinkedIn = responseMap.get("linkedin_url")!;
        syncableData.linkedinUrl = {
          source: 'application',
          applicationValue: appLinkedIn,
          profileValue: currentProfile?.linkedinUrl,
          willSync: !currentProfile?.linkedinUrl && appLinkedIn.trim().length > 0,
          reason: currentProfile?.linkedinUrl ? 'Profile LinkedIn already exists' : 'Will add from application'
        };
      }

      // GitHub URL mapping
      if (responseMap.has("github_url")) {
        const appGitHub = responseMap.get("github_url")!;
        syncableData.githubUrl = {
          source: 'application',
          applicationValue: appGitHub,
          profileValue: currentProfile?.githubUrl,
          willSync: !currentProfile?.githubUrl && appGitHub.trim().length > 0,
          reason: currentProfile?.githubUrl ? 'Profile GitHub already exists' : 'Will add from application'
        };
      }

      // Twitter URL mapping
      if (responseMap.has("twitter")) {
        const appTwitter = responseMap.get("twitter")!;
        syncableData.twitterUrl = {
          source: 'application',
          applicationValue: appTwitter,
          profileValue: currentProfile?.twitterUrl,
          willSync: !currentProfile?.twitterUrl && appTwitter.trim().length > 0,
          reason: currentProfile?.twitterUrl ? 'Profile Twitter already exists' : 'Will add from application'
        };
      }

      // Telegram handle mapping
      if (responseMap.has("telegram")) {
        const appTelegram = responseMap.get("telegram")!;
        syncableData.telegramHandle = {
          source: 'application',
          applicationValue: appTelegram,
          profileValue: currentProfile?.telegramHandle,
          willSync: !currentProfile?.telegramHandle && appTelegram.trim().length > 0,
          reason: currentProfile?.telegramHandle ? 'Profile Telegram already exists' : 'Will add from application'
        };
      }

      return {
        application: {
          id: application.id,
          eventName: application.event?.name ?? undefined,
          submittedAt: application.submittedAt,
        },
        syncableData,
        hasBeenSynced: application.profileSyncs.length > 0,
      };
    }),

  syncFromApplication: protectedProcedure
    .input(z.object({ 
      applicationId: z.string(),
      fieldsToSync: z.array(z.string()), // Array of field names to sync
    }))
    .mutation(async ({ ctx, input }) => {
      const application = await ctx.db.application.findUnique({
        where: { 
          id: input.applicationId,
          userId: ctx.session.user.id,
        },
        include: {
          responses: {
            include: {
              question: {
                select: {
                  questionKey: true,
                },
              },
            },
          },
        },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      // Get or create profile
      let profile = await ctx.db.userProfile.findUnique({
        where: { userId: ctx.session.user.id },
      });

      profile ??= await ctx.db.userProfile.create({
        data: { userId: ctx.session.user.id },
      });

      // Map responses
      const responseMap = new Map(
        application.responses.map(r => [r.question.questionKey, r.answer])
      );

      const updateData: Partial<{
        bio: string;
        location: string;
        company: string;
        linkedinUrl: string;
        githubUrl: string;
        twitterUrl: string;
        telegramHandle: string;
        skills: string[];
      }> = {};

      const syncedFields: string[] = [];

      for (const field of input.fieldsToSync) {
        switch (field) {
          case 'skills':
            if (responseMap.has("technical_skills")) {
              try {
                const appSkills = JSON.parse(responseMap.get("technical_skills")!) as string[];
                const existingSkills = profile.skills ?? [];
                const mergedSkills = Array.from(new Set([...existingSkills, ...appSkills]));
                updateData.skills = mergedSkills;
                syncedFields.push('skills');
              } catch {
                // Skip if parsing fails
              }
            }
            break;

          case 'bio':
            if (responseMap.has("bio") && !profile.bio) {
              const appBio = responseMap.get("bio")!;
              if (appBio.trim()) {
                updateData.bio = appBio.trim();
                syncedFields.push('bio');
              }
            }
            break;

          case 'location':
            if (responseMap.has("location") && !profile.location) {
              const appLocation = responseMap.get("location")!;
              if (appLocation.trim()) {
                updateData.location = appLocation.trim();
                syncedFields.push('location');
              }
            }
            break;

          case 'company':
            if (responseMap.has("company") && !profile.company) {
              const appCompany = responseMap.get("company")!;
              if (appCompany.trim()) {
                updateData.company = appCompany.trim();
                syncedFields.push('company');
              }
            }
            break;

          case 'linkedinUrl':
            if (responseMap.has("linkedin_url") && !profile.linkedinUrl) {
              const appLinkedIn = responseMap.get("linkedin_url")!;
              if (appLinkedIn.trim()) {
                updateData.linkedinUrl = appLinkedIn.trim();
                syncedFields.push('linkedinUrl');
              }
            }
            break;

          case 'githubUrl':
            if (responseMap.has("github_url") && !profile.githubUrl) {
              const appGitHub = responseMap.get("github_url")!;
              if (appGitHub.trim()) {
                updateData.githubUrl = appGitHub.trim();
                syncedFields.push('githubUrl');
              }
            }
            break;

          case 'twitterUrl':
            if (responseMap.has("twitter") && !profile.twitterUrl) {
              const appTwitter = responseMap.get("twitter")!;
              if (appTwitter.trim()) {
                updateData.twitterUrl = appTwitter.trim();
                syncedFields.push('twitterUrl');
              }
            }
            break;

          case 'telegramHandle':
            if (responseMap.has("telegram") && !profile.telegramHandle) {
              const appTelegram = responseMap.get("telegram")!;
              if (appTelegram.trim()) {
                updateData.telegramHandle = appTelegram.trim();
                syncedFields.push('telegramHandle');
              }
            }
            break;
        }
      }

      // Update profile if there are changes
      if (Object.keys(updateData).length > 0) {
        await ctx.db.userProfile.update({
          where: { id: profile.id },
          data: updateData,
        });
      }

      // Record the sync - check if already exists first
      const existingSync = await ctx.db.profileSync.findUnique({
        where: {
          userId_applicationId: {
            userId: ctx.session.user.id,
            applicationId: input.applicationId,
          },
        },
      });

      if (existingSync) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This application has already been imported to your profile. Each application can only be imported once to prevent data conflicts.",
        });
      }

      await ctx.db.profileSync.create({
        data: {
          userId: ctx.session.user.id,
          applicationId: input.applicationId,
          syncedFields,
        },
      });

      return {
        success: true,
        syncedFields,
        updatedFields: Object.keys(updateData),
      };
    }),

  // Get resident profiles with completeness data for admin
  getResidentProfilesForAdmin: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check admin access
      if (ctx.session.user.role !== "admin" && ctx.session.user.role !== "staff") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      // Get all accepted applications for the event
      const applications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          status: "ACCEPTED",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          responses: {
            include: {
              question: {
                select: {
                  questionKey: true,
                  questionEn: true,
                  order: true,
                },
              },
            },
          },
        },
        orderBy: {
          user: {
            name: "asc",
          },
        },
      });

      // Get profile data for each user
      const residentsWithProfiles = await Promise.all(
        applications
          .filter((app) => app.user !== null)
          .map(async (app) => {
            const profile = await ctx.db.userProfile.findUnique({
              where: { userId: app.user!.id },
              include: {
                projects: {
                  select: {
                    id: true,
                    title: true,
                    updates: {
                      select: {
                        id: true,
                      },
                    },
                  },
                },
              },
            });

            // Calculate profile completeness using the same logic as getProfileCompletion
            const fields = {
              name: !!app.user!.name,
              image: !!app.user!.image,
              bio: !!profile?.bio,
              jobTitle: !!profile?.jobTitle,
              company: !!profile?.company,
              location: !!profile?.location,
              skills: !!profile?.skills && profile.skills.length > 0,
              githubUrl: !!profile?.githubUrl,
              linkedinUrl: !!profile?.linkedinUrl,
              website: !!profile?.website,
            };

            const completedFields = Object.values(fields).filter(Boolean).length;
            const totalFields = Object.keys(fields).length;
            const percentage = Math.round((completedFields / totalFields) * 100);

            // Calculate total update count across all projects
            const totalUpdates = profile?.projects.reduce(
              (sum, project) => sum + project.updates.length,
              0
            ) ?? 0;

            return {
              userId: app.user!.id,
              name: app.user!.name,
              image: app.user!.image,
              completeness: {
                percentage,
                completedFields,
                totalFields,
                meetsThreshold: percentage >= 70,
              },
              projectCount: profile?.projects.length ?? 0,
              projectUpdateCount: totalUpdates,
              projects: profile?.projects.map(p => ({
                id: p.id,
                title: p.title,
                updateCount: p.updates.length,
              })) ?? [],
              application: app,
            };
          })
      );

      // Sort by profile completeness (descending - highest completion first)
      const sortedResidents = residentsWithProfiles.sort(
        (a, b) => b.completeness.percentage - a.completeness.percentage
      );

      return sortedResidents;
    }),

  // Admin endpoints for bulk profile sync
  adminGetSyncStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Check admin access
      if (ctx.session.user.role !== "admin" && ctx.session.user.role !== "staff") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      // Get submitted applications count (all statuses except DRAFT)
      const submittedApps = await ctx.db.application.count({
        where: { 
          status: { in: ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED"] }
        },
      });

      // Get users with submitted applications but no profile syncs
      const usersWithUnsyncedApps = await ctx.db.user.count({
        where: {
          applications: {
            some: {
              status: { in: ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED"] },
              profileSyncs: { none: {} },
            },
          },
        },
      });

      // Get total profile syncs
      const totalSyncs = await ctx.db.profileSync.count();

      // Get profiles count
      const totalProfiles = await ctx.db.userProfile.count();

      return {
        submittedApplications: submittedApps,
        usersWithUnsyncedApplications: usersWithUnsyncedApps,
        totalProfileSyncs: totalSyncs,
        totalProfiles,
        syncCoverage: submittedApps > 0 ? Math.round(((submittedApps - usersWithUnsyncedApps) / submittedApps) * 100) : 0,
      };
    }),

  adminBulkSyncProfiles: protectedProcedure
    .input(z.object({
      dryRun: z.boolean().default(false),
      limitUsers: z.number().min(1).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check admin access
      if (ctx.session.user.role !== "admin" && ctx.session.user.role !== "staff") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      // Find users with submitted applications but no profile syncs
      const usersToSync = await ctx.db.user.findMany({
        where: {
          applications: {
            some: {
              status: { in: ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED"] },
              profileSyncs: { none: {} },
            },
          },
        },
        include: {
          applications: {
            where: { 
              status: { in: ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED"] },
              profileSyncs: { none: {} }
            },
            include: {
              responses: {
                include: {
                  question: {
                    select: {
                      questionKey: true,
                    },
                  },
                },
              },
              profileSyncs: true,
            },
            orderBy: { submittedAt: "desc" },
            take: 1, // Use most recent accepted application
          },
          profile: true,
        },
        take: input.limitUsers ?? 100,
      });

      const syncResults: Array<{
        userId: string;
        userEmail: string;
        applicationId: string;
        syncedFields: string[];
        error?: string;
      }> = [];

      if (input.dryRun) {
        // Preview what would be synced
        for (const user of usersToSync) {
          const app = user.applications[0];
          if (!app) continue;

          const responseMap = new Map(
            app.responses.map(r => [r.question.questionKey, r.answer])
          );

          const previewFields: string[] = [];

          // Check which fields would be synced
          if (responseMap.has("technical_skills")) {
            try {
              const appSkills = JSON.parse(responseMap.get("technical_skills")!) as string[];
              if (appSkills.length > 0) previewFields.push('skills');
            } catch {
              // Skip if parsing fails
            }
          }

          if (responseMap.has("bio") && !user.profile?.bio) {
            const appBio = responseMap.get("bio")!;
            if (appBio.trim()) previewFields.push('bio');
          }

          if (responseMap.has("location") && !user.profile?.location) {
            const appLocation = responseMap.get("location")!;
            if (appLocation.trim()) previewFields.push('location');
          }

          if (responseMap.has("company") && !user.profile?.company) {
            const appCompany = responseMap.get("company")!;
            if (appCompany.trim()) previewFields.push('company');
          }

          if (responseMap.has("linkedin_url") && !user.profile?.linkedinUrl) {
            const appLinkedIn = responseMap.get("linkedin_url")!;
            if (appLinkedIn.trim()) previewFields.push('linkedinUrl');
          }

          if (responseMap.has("github_url") && !user.profile?.githubUrl) {
            const appGitHub = responseMap.get("github_url")!;
            if (appGitHub.trim()) previewFields.push('githubUrl');
          }

          if (responseMap.has("twitter") && !user.profile?.twitterUrl) {
            const appTwitter = responseMap.get("twitter")!;
            if (appTwitter.trim()) previewFields.push('twitterUrl');
          }

          if (responseMap.has("telegram") && !user.profile?.telegramHandle) {
            const appTelegram = responseMap.get("telegram")!;
            if (appTelegram.trim()) previewFields.push('telegramHandle');
          }

          syncResults.push({
            userId: user.id,
            userEmail: user.email ?? 'unknown',
            applicationId: app.id,
            syncedFields: previewFields,
          });
        }
      } else {
        // Perform actual sync
        for (const user of usersToSync) {
          const app = user.applications[0];
          if (!app) continue;

          try {
            // Get or create profile
            let profile = user.profile;
            profile ??= await ctx.db.userProfile.create({
              data: { userId: user.id },
            });
            const responseMap = new Map(
              app.responses.map(r => [r.question.questionKey, r.answer])
            );

            const updateData: Partial<{
              bio: string;
              location: string;
              company: string;
              linkedinUrl: string;
              githubUrl: string;
              twitterUrl: string;
              telegramHandle: string;
              skills: string[];
            }> = {};

            const syncedFields: string[] = [];

            // Sync skills
            if (responseMap.has("technical_skills")) {
              try {
                const appSkills = JSON.parse(responseMap.get("technical_skills")!) as string[];
                const existingSkills = profile.skills ?? [];
                const mergedSkills = Array.from(new Set([...existingSkills, ...appSkills]));
                updateData.skills = mergedSkills;
                syncedFields.push('skills');
              } catch {
                // Skip if parsing fails
              }
            }

            // Sync other fields (only if profile field is empty)
            if (responseMap.has("bio") && !profile.bio) {
              const appBio = responseMap.get("bio")!;
              if (appBio.trim()) {
                updateData.bio = appBio.trim();
                syncedFields.push('bio');
              }
            }

            if (responseMap.has("location") && !profile.location) {
              const appLocation = responseMap.get("location")!;
              if (appLocation.trim()) {
                updateData.location = appLocation.trim();
                syncedFields.push('location');
              }
            }

            if (responseMap.has("company") && !profile.company) {
              const appCompany = responseMap.get("company")!;
              if (appCompany.trim()) {
                updateData.company = appCompany.trim();
                syncedFields.push('company');
              }
            }

            if (responseMap.has("linkedin_url") && !profile.linkedinUrl) {
              const appLinkedIn = responseMap.get("linkedin_url")!;
              if (appLinkedIn.trim()) {
                updateData.linkedinUrl = appLinkedIn.trim();
                syncedFields.push('linkedinUrl');
              }
            }

            if (responseMap.has("github_url") && !profile.githubUrl) {
              const appGitHub = responseMap.get("github_url")!;
              if (appGitHub.trim()) {
                updateData.githubUrl = appGitHub.trim();
                syncedFields.push('githubUrl');
              }
            }

            // Sync Twitter URL
            if (responseMap.has("twitter") && !profile.twitterUrl) {
              const appTwitter = responseMap.get("twitter")!;
              if (appTwitter.trim()) {
                updateData.twitterUrl = appTwitter.trim();
                syncedFields.push('twitterUrl');
              }
            }

            // Sync Telegram handle
            if (responseMap.has("telegram") && !profile.telegramHandle) {
              const appTelegram = responseMap.get("telegram")!;
              if (appTelegram.trim()) {
                updateData.telegramHandle = appTelegram.trim();
                syncedFields.push('telegramHandle');
              }
            }

            // Update profile if there are changes
            if (Object.keys(updateData).length > 0) {
              await ctx.db.userProfile.update({
                where: { id: profile.id },
                data: updateData,
              });
            }

            // Record the sync - use upsert to handle duplicates gracefully
            await ctx.db.profileSync.upsert({
              where: {
                userId_applicationId: {
                  userId: user.id,
                  applicationId: app.id,
                },
              },
              update: {
                syncedFields, // Update with new synced fields if already exists
              },
              create: {
                userId: user.id,
                applicationId: app.id,
                syncedFields,
              },
            });

            syncResults.push({
              userId: user.id,
              userEmail: user.email ?? 'unknown',
              applicationId: app.id,
              syncedFields,
            });

          } catch (error) {
            syncResults.push({
              userId: user.id,
              userEmail: user.email ?? 'unknown',
              applicationId: app.id,
              syncedFields: [],
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      return {
        totalProcessed: usersToSync.length,
        successful: syncResults.filter(r => !r.error).length,
        failed: syncResults.filter(r => r.error).length,
        results: syncResults,
        dryRun: input.dryRun,
      };
    }),
});