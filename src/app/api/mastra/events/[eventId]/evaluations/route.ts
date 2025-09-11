import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";

async function GET(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  
  try {
    // Get all evaluations for applications in this event
    const evaluations = await db.applicationEvaluation.findMany({
      where: {
        application: {
          eventId: eventId
        },
        status: {
          in: ["COMPLETED", "REVIEWED"] // Only include completed evaluations
        }
      },
      include: {
        application: {
          select: {
            id: true,
            userId: true,
            status: true,
            submittedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            role: true,
          }
        },
        scores: {
          include: {
            criteria: {
              select: {
                id: true,
                name: true,
                category: true,
                weight: true,
                maxScore: true,
                minScore: true,
              }
            }
          }
        },
        comments: {
          select: {
            id: true,
            questionKey: true,
            comment: true,
            isPrivate: true,
            createdAt: true,
          }
        }
      },
      orderBy: [
        { application: { submittedAt: "desc" } },
        { completedAt: "desc" }
      ]
    });

    // Get event info for context  
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!event) {
      return Response.json(
        { 
          success: false, 
          error: "Event not found" 
        }, 
        { status: 404 }
      );
    }

    // Transform evaluations for AI agent understanding
    const transformedEvaluations = evaluations.map(evaluation => ({
      id: evaluation.id,
      applicationId: evaluation.applicationId,
      reviewerId: evaluation.reviewerId,
      status: evaluation.status,
      stage: evaluation.stage,
      overallScore: evaluation.overallScore,
      overallComments: evaluation.overallComments,
      recommendation: evaluation.recommendation,
      confidence: evaluation.confidence,
      timeSpentMinutes: evaluation.timeSpentMinutes,
      completedAt: evaluation.completedAt,
      
      // Application context
      application: {
        id: evaluation.application.id,
        userId: evaluation.application.userId,
        status: evaluation.application.status,
        submittedAt: evaluation.application.submittedAt,
        applicant: evaluation.application.user,
      },
      
      // Reviewer context
      reviewer: evaluation.reviewer,
      
      // Detailed scores by criteria
      scores: evaluation.scores.map(score => ({
        criteriaId: score.criteriaId,
        criteriaName: score.criteria.name,
        criteriaCategory: score.criteria.category,
        criteriaWeight: score.criteria.weight,
        scoreRange: {
          min: score.criteria.minScore,
          max: score.criteria.maxScore,
        },
        score: score.score,
        reasoning: score.reasoning,
        // Normalized score (0-1) for easier comparison
        normalizedScore: (score.score - score.criteria.minScore) / (score.criteria.maxScore - score.criteria.minScore),
      })),
      
      // Comments organized by question
      comments: evaluation.comments.map(comment => ({
        id: comment.id,
        questionKey: comment.questionKey,
        comment: comment.comment,
        isPrivate: comment.isPrivate,
        createdAt: comment.createdAt,
      })),
      
      // Video evaluation fields
      video: {
        watched: evaluation.videoWatched,
        quality: evaluation.videoQuality,
        timestamps: evaluation.videoTimestamp ? JSON.parse(evaluation.videoTimestamp) as unknown : null,
      },
      
      // Computed metrics for AI analysis
      metrics: {
        averageScore: evaluation.scores.length > 0 
          ? evaluation.scores.reduce((sum, score) => sum + score.score, 0) / evaluation.scores.length 
          : null,
        weightedScore: evaluation.overallScore,
        categoryScores: evaluation.scores.reduce((acc, score) => {
          const category = score.criteria.category;
          acc[category] ??= [];
          acc[category].push(score.score);
          return acc;
        }, {} as Record<string, number[]>),
        completeness: {
          hasOverallScore: !!evaluation.overallScore,
          hasRecommendation: !!evaluation.recommendation,
          hasComments: evaluation.overallComments !== null && evaluation.overallComments.length > 0,
          scoreCount: evaluation.scores.length,
        }
      }
    }));

    // Aggregate statistics for AI analysis
    const statistics = {
      totalEvaluations: transformedEvaluations.length,
      uniqueApplications: new Set(transformedEvaluations.map(e => e.applicationId)).size,
      uniqueReviewers: new Set(transformedEvaluations.map(e => e.reviewerId)).size,
      recommendations: {
        ACCEPT: transformedEvaluations.filter(e => e.recommendation === "ACCEPT").length,
        REJECT: transformedEvaluations.filter(e => e.recommendation === "REJECT").length,
        WAITLIST: transformedEvaluations.filter(e => e.recommendation === "WAITLIST").length,
        NEEDS_MORE_INFO: transformedEvaluations.filter(e => e.recommendation === "NEEDS_MORE_INFO").length,
      },
      averageOverallScore: transformedEvaluations
        .filter(e => e.overallScore !== null)
        .reduce((sum, e, _, arr) => sum + (e.overallScore! / arr.length), 0),
      averageConfidence: transformedEvaluations
        .filter(e => e.confidence !== null)
        .reduce((sum, e, _, arr) => sum + (e.confidence! / arr.length), 0),
    };

    return Response.json({
      success: true,
      data: {
        eventId,
        event,
        evaluations: transformedEvaluations,
        statistics,
        metadata: {
          generatedAt: new Date().toISOString(),
          purpose: "AI analysis of existing human evaluations",
          usage: "Analyze patterns in human evaluations to improve AI ranking accuracy",
        }
      }
    });

  } catch (error) {
    console.error("[MASTRA API] Error fetching evaluations:", error);
    
    return Response.json(
      { 
        success: false, 
        error: "Failed to fetch evaluations",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };