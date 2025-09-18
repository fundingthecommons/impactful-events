import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";

async function GET(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  
  try {
    // Get all accepted applications with user demographics
    const acceptedApplications = await db.application.findMany({
      where: {
        eventId,
        status: "ACCEPTED"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            // Demographics fields from user profile
            company: true,
            jobTitle: true,
            location: true,
            linkedinUrl: true,
            githubUrl: true,
            websiteUrl: true,
            twitterUrl: true,
            profilePictureUrl: true,
          },
        },
        responses: {
          include: {
            question: {
              select: {
                questionKey: true,
                questionEn: true,
                questionType: true,
              }
            }
          }
        }
      },
    });

    // Extract demographic insights
    const demographics = {
      totalAccepted: acceptedApplications.length,
      
      // Company distribution
      companies: acceptedApplications
        .map(app => app.user?.company)
        .filter(Boolean)
        .reduce((acc, company) => {
          acc[company!] = (acc[company!] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      
      // Job title patterns
      jobTitles: acceptedApplications
        .map(app => app.user?.jobTitle)
        .filter(Boolean)
        .reduce((acc, title) => {
          acc[title!] = (acc[title!] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      
      // Geographic distribution
      locations: acceptedApplications
        .map(app => app.user?.location)
        .filter(Boolean)
        .reduce((acc, location) => {
          acc[location!] = (acc[location!] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      
      // Social presence indicators
      socialPresence: {
        hasLinkedIn: acceptedApplications.filter(app => app.user?.linkedinUrl).length,
        hasGitHub: acceptedApplications.filter(app => app.user?.githubUrl).length,
        hasWebsite: acceptedApplications.filter(app => app.user?.websiteUrl).length,
        hasTwitter: acceptedApplications.filter(app => app.user?.twitterUrl).length,
        hasProfilePicture: acceptedApplications.filter(app => app.user?.profilePictureUrl).length,
      },
      
      // Application response patterns
      responsePatterns: {} as Record<string, Record<string, number>>
    };

    // Analyze response patterns for key demographic questions
    const demographicQuestions = acceptedApplications[0]?.responses.filter(r => 
      r.question.questionKey?.includes('background') ||
      r.question.questionKey?.includes('experience') ||
      r.question.questionKey?.includes('expertise') ||
      r.question.questionKey?.includes('skills')
    ) ?? [];

    demographicQuestions.forEach(response => {
      const questionKey = response.question.questionKey;
      if (!questionKey) return;
      
      if (!demographics.responsePatterns[questionKey]) {
        demographics.responsePatterns[questionKey] = {};
      }
      
      // For select/multiselect questions, count option selections
      if (response.question.questionType === 'SELECT' || response.question.questionType === 'MULTISELECT') {
        const answers = Array.isArray(response.answer) 
          ? response.answer 
          : response.answer ? [response.answer] : [];
        
        answers.forEach(answer => {
          if (typeof answer === 'string') {
            demographics.responsePatterns[questionKey]![answer] = 
              (demographics.responsePatterns[questionKey]![answer] ?? 0) + 1;
          }
        });
      }
    });

    // Get event context
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        type: true,
      },
    });

    return Response.json({
      success: true,
      data: {
        eventId,
        event,
        demographics,
        metadata: {
          generatedAt: new Date().toISOString(),
          purpose: "Demographics analysis of accepted applications for AI bias detection",
          totalApplications: acceptedApplications.length,
          anonymized: true,
        }
      }
    });

  } catch (error) {
    console.error("[MASTRA API] Error fetching accepted demographics:", error);
    
    return Response.json(
      { 
        success: false, 
        error: "Failed to fetch accepted demographics",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };