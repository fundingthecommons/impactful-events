import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";

async function GET(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  const { searchParams } = new URL(request.url);
  
  // Query parameters
  const applicationId = searchParams.get('applicationId');
  const reviewerId = searchParams.get('reviewerId');
  const aiOnly = searchParams.get('aiOnly') === 'true';
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');
  const limit = parseInt(searchParams.get('limit') ?? '100');
  
  try {
    // Build where clause for audit trail query
    const whereClause: any = {
      application: {
        eventId: eventId
      }
    };
    
    if (applicationId) {
      whereClause.applicationId = applicationId;
    }
    
    if (reviewerId) {
      whereClause.reviewerId = reviewerId;
    }
    
    if (aiOnly) {
      whereClause.reviewer = {
        email: "ai-reviewer@fundingthecommons.io"
      };
    }
    
    if (fromDate || toDate) {
      whereClause.createdAt = {};
      if (fromDate) whereClause.createdAt.gte = new Date(fromDate);
      if (toDate) whereClause.createdAt.lte = new Date(toDate);
    }

    // Get all evaluation activities
    const evaluations = await db.applicationEvaluation.findMany({
      where: whereClause,
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
            email: true,
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
              }
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        },
        comments: {
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit
    });

    // Get application status changes (if we have a status audit table)
    // For now, we'll infer status changes from evaluation completion times
    
    // Get all applications for context
    const applications = await db.application.findMany({
      where: {
        eventId,
        ...(applicationId ? { id: applicationId } : {})
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        submittedAt: true,
      }
    });

    // Build comprehensive audit trail
    const auditEvents: Array<{
      id: string;
      timestamp: Date;
      eventType: 'EVALUATION_STARTED' | 'EVALUATION_COMPLETED' | 'SCORE_UPDATED' | 'COMMENT_ADDED' | 'STATUS_CHANGED' | 'AI_EVALUATION';
      applicationId: string;
      reviewerId?: string;
      reviewerName?: string;
      isAIReviewer: boolean;
      details: any;
      metadata?: any;
    }> = [];

    // Process evaluation events
    evaluations.forEach(evaluation => {
      const isAI = evaluation.reviewer.email === "ai-reviewer@fundingthecommons.io";
      
      // Evaluation started event
      auditEvents.push({
        id: `eval_start_${evaluation.id}`,
        timestamp: evaluation.createdAt,
        eventType: isAI ? 'AI_EVALUATION' : 'EVALUATION_STARTED',
        applicationId: evaluation.applicationId,
        reviewerId: evaluation.reviewerId,
        reviewerName: evaluation.reviewer.name ?? evaluation.reviewer.email,
        isAIReviewer: isAI,
        details: {
          evaluationId: evaluation.id,
          stage: evaluation.stage,
          action: 'started',
        }
      });

      // Evaluation completed event
      if (evaluation.completedAt) {
        auditEvents.push({
          id: `eval_complete_${evaluation.id}`,
          timestamp: evaluation.completedAt,
          eventType: 'EVALUATION_COMPLETED',
          applicationId: evaluation.applicationId,
          reviewerId: evaluation.reviewerId,
          reviewerName: evaluation.reviewer.name ?? evaluation.reviewer.email,
          isAIReviewer: isAI,
          details: {
            evaluationId: evaluation.id,
            stage: evaluation.stage,
            overallScore: evaluation.overallScore,
            recommendation: evaluation.recommendation,
            confidence: evaluation.confidence,
            timeSpentMinutes: evaluation.timeSpentMinutes,
            action: 'completed',
          },
          metadata: isAI && evaluation.internalNotes ? JSON.parse(evaluation.internalNotes) : undefined,
        });
      }

      // Individual score events
      evaluation.scores.forEach(score => {
        auditEvents.push({
          id: `score_${score.id}`,
          timestamp: score.createdAt,
          eventType: 'SCORE_UPDATED',
          applicationId: evaluation.applicationId,
          reviewerId: evaluation.reviewerId,
          reviewerName: evaluation.reviewer.name ?? evaluation.reviewer.email,
          isAIReviewer: isAI,
          details: {
            evaluationId: evaluation.id,
            scoreId: score.id,
            criteriaId: score.criteriaId,
            criteriaName: score.criteria.name,
            criteriaCategory: score.criteria.category,
            score: score.score,
            reasoning: score.reasoning,
            action: 'score_submitted',
          }
        });
      });

      // Comment events
      evaluation.comments.forEach(comment => {
        auditEvents.push({
          id: `comment_${comment.id}`,
          timestamp: comment.createdAt,
          eventType: 'COMMENT_ADDED',
          applicationId: evaluation.applicationId,
          reviewerId: evaluation.reviewerId,
          reviewerName: evaluation.reviewer.name ?? evaluation.reviewer.email,
          isAIReviewer: isAI,
          details: {
            evaluationId: evaluation.id,
            commentId: comment.id,
            questionKey: comment.questionKey,
            comment: comment.comment,
            isPrivate: comment.isPrivate,
            action: 'comment_added',
          }
        });
      });
    });

    // Sort all events by timestamp
    auditEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Generate audit statistics
    const statistics = {
      totalEvents: auditEvents.length,
      eventTypes: {
        EVALUATION_STARTED: auditEvents.filter(e => e.eventType === 'EVALUATION_STARTED').length,
        EVALUATION_COMPLETED: auditEvents.filter(e => e.eventType === 'EVALUATION_COMPLETED').length,
        AI_EVALUATION: auditEvents.filter(e => e.eventType === 'AI_EVALUATION').length,
        SCORE_UPDATED: auditEvents.filter(e => e.eventType === 'SCORE_UPDATED').length,
        COMMENT_ADDED: auditEvents.filter(e => e.eventType === 'COMMENT_ADDED').length,
      },
      reviewerActivity: auditEvents.reduce((acc, event) => {
        if (!event.reviewerId) return acc;
        acc[event.reviewerId] = (acc[event.reviewerId] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      aiVsHumanActivity: {
        aiEvents: auditEvents.filter(e => e.isAIReviewer).length,
        humanEvents: auditEvents.filter(e => !e.isAIReviewer).length,
      },
      timeRange: {
        earliest: auditEvents[auditEvents.length - 1]?.timestamp,
        latest: auditEvents[0]?.timestamp,
      }
    };

    // Identify patterns and anomalies
    const patterns = {
      rapidFireEvaluations: auditEvents.filter(event => 
        event.eventType === 'EVALUATION_COMPLETED' && 
        event.details.timeSpentMinutes && 
        event.details.timeSpentMinutes < 5
      ).length,
      
      highVarianceScoring: evaluations.filter(eval => {
        const scores = eval.scores.map(s => s.score);
        if (scores.length < 2) return false;
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        return Math.sqrt(variance) > 15; // High standard deviation
      }).length,
      
      incompleteEvaluations: evaluations.filter(eval => !eval.completedAt).length,
      
      reviewerWorkload: Object.entries(statistics.reviewerActivity)
        .map(([reviewerId, count]) => ({ reviewerId, eventCount: count }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10), // Top 10 most active reviewers
    };

    return Response.json({
      success: true,
      data: {
        eventId,
        auditTrail: auditEvents,
        statistics,
        patterns,
        filters: {
          applicationId,
          reviewerId,
          aiOnly,
          fromDate,
          toDate,
          limit,
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          purpose: "Complete audit trail of evaluation activities for compliance and analysis",
          dataRetention: "Audit data includes all evaluation actions and timestamps",
          privacy: "Personal details anonymized where possible while maintaining audit integrity"
        }
      }
    });

  } catch (error) {
    console.error("[MASTRA API] Error generating audit trail:", error);
    
    return Response.json(
      { 
        success: false, 
        error: "Failed to generate audit trail",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };