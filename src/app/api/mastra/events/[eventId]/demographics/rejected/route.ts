import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";

async function GET(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  
  try {
    // Get all rejected applications with user demographics and evaluation details
    const rejectedApplications = await db.application.findMany({
      where: {
        eventId,
        status: "REJECTED"
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
        // Include evaluation details for rejection analysis
        evaluations: {
          select: {
            id: true,
            status: true,
            stage: true,
            overallScore: true,
            recommendation: true,
            overallComments: true,
            confidence: true,
            completedAt: true,
            reviewer: {
              select: {
                id: true,
                name: true,
              }
            },
            scores: {
              select: {
                score: true,
                criteria: {
                  select: {
                    name: true,
                    category: true,
                    weight: true,
                  }
                }
              }
            }
          }
        }
      },
    });

    // Extract demographic insights with rejection analysis
    const demographics = {
      totalRejected: rejectedApplications.length,
      
      // Rejection analysis
      rejectionAnalysis: {
        averageScore: rejectedApplications
          .flatMap(app => app.evaluations)
          .filter(eval => eval.overallScore !== null)
          .reduce((sum, eval, _, arr) => sum + (eval.overallScore! / arr.length), 0) || null,
        
        commonRejectionReasons: rejectedApplications
          .flatMap(app => app.evaluations)
          .map(eval => eval.overallComments)
          .filter(Boolean)
          .slice(0, 10), // Sample of rejection reasons for pattern analysis
        
        rejectionByStage: rejectedApplications
          .flatMap(app => app.evaluations)
          .reduce((acc, eval) => {
            acc[eval.stage] = (acc[eval.stage] ?? 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        
        categoryScores: {} as Record<string, number[]>
      },
      
      // Company distribution
      companies: rejectedApplications
        .map(app => app.user?.company)
        .filter(Boolean)
        .reduce((acc, company) => {
          acc[company!] = (acc[company!] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      
      // Job title patterns
      jobTitles: rejectedApplications
        .map(app => app.user?.jobTitle)
        .filter(Boolean)
        .reduce((acc, title) => {
          acc[title!] = (acc[title!] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      
      // Geographic distribution
      locations: rejectedApplications
        .map(app => app.user?.location)
        .filter(Boolean)
        .reduce((acc, location) => {
          acc[location!] = (acc[location!] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      
      // Social presence indicators
      socialPresence: {
        hasLinkedIn: rejectedApplications.filter(app => app.user?.linkedinUrl).length,
        hasGitHub: rejectedApplications.filter(app => app.user?.githubUrl).length,
        hasWebsite: rejectedApplications.filter(app => app.user?.websiteUrl).length,
        hasTwitter: rejectedApplications.filter(app => app.user?.twitterUrl).length,
        hasProfilePicture: rejectedApplications.filter(app => app.user?.profilePictureUrl).length,
      },
      
      // Application response patterns
      responsePatterns: {} as Record<string, Record<string, number>>
    };

    // Calculate category-specific scores for rejection patterns
    rejectedApplications.forEach(app => {
      app.evaluations.forEach(evaluation => {
        evaluation.scores.forEach(score => {
          const category = score.criteria.category;
          if (!demographics.rejectionAnalysis.categoryScores[category]) {
            demographics.rejectionAnalysis.categoryScores[category] = [];
          }
          demographics.rejectionAnalysis.categoryScores[category].push(score.score);
        });
      });
    });

    // Calculate averages for category scores
    const categoryAverages = Object.entries(demographics.rejectionAnalysis.categoryScores).reduce((acc, [category, scores]) => {
      acc[category] = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      return acc;
    }, {} as Record<string, number>);

    demographics.rejectionAnalysis.categoryScores = categoryAverages as any;

    // Analyze response patterns for key demographic questions
    const sampleResponses = rejectedApplications[0]?.responses.filter(r => 
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
      
      // Count responses across all rejected applications
      rejectedApplications.forEach(app => {
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
          purpose: "Demographics analysis of rejected applications for AI bias detection and improvement",
          totalApplications: rejectedApplications.length,
          anonymized: true,
          includesRejectionAnalysis: true,
          warningNote: "Use rejection patterns carefully to avoid reinforcing biases in AI training"
        }
      }
    });

  } catch (error) {
    console.error("[MASTRA API] Error fetching rejected demographics:", error);
    
    return Response.json(
      { 
        success: false, 
        error: "Failed to fetch rejected demographics",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };