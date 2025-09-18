import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";

async function GET(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  
  try {
    // Get all under-review applications with user demographics
    const underReviewApplications = await db.application.findMany({
      where: {
        eventId,
        status: "UNDER_REVIEW"
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
        },
        // Include evaluation progress for under-review applications
        evaluations: {
          select: {
            id: true,
            status: true,
            stage: true,
            overallScore: true,
            recommendation: true,
            completedAt: true,
            reviewer: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      },
    });

    // Extract demographic insights with evaluation progress
    const demographics = {
      totalUnderReview: underReviewApplications.length,
      
      // Evaluation progress breakdown
      evaluationProgress: {
        notStarted: underReviewApplications.filter(app => app.evaluations.length === 0).length,
        inProgress: underReviewApplications.filter(app => 
          app.evaluations.some(eval => eval.status === "IN_PROGRESS")
        ).length,
        completed: underReviewApplications.filter(app =>
          app.evaluations.some(eval => eval.status === "COMPLETED")
        ).length,
        averageEvaluationsPerApplication: underReviewApplications.length > 0 
          ? underReviewApplications.reduce((sum, app) => sum + app.evaluations.length, 0) / underReviewApplications.length
          : 0,
      },
      
      // Company distribution
      companies: underReviewApplications
        .map(app => app.user?.company)
        .filter(Boolean)
        .reduce((acc, company) => {
          acc[company!] = (acc[company!] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      
      // Job title patterns
      jobTitles: underReviewApplications
        .map(app => app.user?.jobTitle)
        .filter(Boolean)
        .reduce((acc, title) => {
          acc[title!] = (acc[title!] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      
      // Geographic distribution
      locations: underReviewApplications
        .map(app => app.user?.location)
        .filter(Boolean)
        .reduce((acc, location) => {
          acc[location!] = (acc[location!] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      
      // Social presence indicators
      socialPresence: {
        hasLinkedIn: underReviewApplications.filter(app => app.user?.linkedinUrl).length,
        hasGitHub: underReviewApplications.filter(app => app.user?.githubUrl).length,
        hasWebsite: underReviewApplications.filter(app => app.user?.websiteUrl).length,
        hasTwitter: underReviewApplications.filter(app => app.user?.twitterUrl).length,
        hasProfilePicture: underReviewApplications.filter(app => app.user?.profilePictureUrl).length,
      },
      
      // Current scoring patterns for applications under review
      currentScoring: {
        averageScore: underReviewApplications
          .flatMap(app => app.evaluations)
          .filter(eval => eval.overallScore !== null)
          .reduce((sum, eval, _, arr) => sum + (eval.overallScore! / arr.length), 0) || null,
        recommendations: underReviewApplications
          .flatMap(app => app.evaluations)
          .filter(eval => eval.recommendation)
          .reduce((acc, eval) => {
            acc[eval.recommendation!] = (acc[eval.recommendation!] ?? 0) + 1;
            return acc;
          }, {} as Record<string, number>),
      },
      
      // Application response patterns
      responsePatterns: {} as Record<string, Record<string, number>>
    };

    // Analyze response patterns for key demographic questions
    const sampleResponses = underReviewApplications[0]?.responses.filter(r => 
      r.question.questionKey?.includes('background') ||
      r.question.questionKey?.includes('experience') ||
      r.question.questionKey?.includes('expertise') ||
      r.question.questionKey?.includes('skills')
    ) ?? [];

    sampleResponses.forEach(response => {
      const questionKey = response.question.questionKey;
      if (!questionKey) return;
      
      if (!demographics.responsePatterns[questionKey]) {
        demographics.responsePatterns[questionKey] = {};
      }
      
      // Count responses across all under-review applications
      underReviewApplications.forEach(app => {
        const appResponse = app.responses.find(r => r.question.questionKey === questionKey);
        if (!appResponse) return;
        
        if (response.question.questionType === 'SELECT' || response.question.questionType === 'MULTISELECT') {
          const answers = Array.isArray(appResponse.answer) 
            ? appResponse.answer 
            : appResponse.answer ? [appResponse.answer] : [];
          
          answers.forEach(answer => {
            if (typeof answer === 'string') {
              demographics.responsePatterns[questionKey]![answer] = 
                (demographics.responsePatterns[questionKey]![answer] ?? 0) + 1;
            }
          });
        }
      });
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
          purpose: "Demographics analysis of under-review applications for AI reviewer prioritization",
          totalApplications: underReviewApplications.length,
          anonymized: true,
          includesEvaluationProgress: true,
        }
      }
    });

  } catch (error) {
    console.error("[MASTRA API] Error fetching under-review demographics:", error);
    
    return Response.json(
      { 
        success: false, 
        error: "Failed to fetch under-review demographics",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };