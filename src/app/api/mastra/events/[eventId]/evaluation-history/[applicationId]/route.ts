import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";

async function GET(
  request: NextRequest, 
  context: { params: Promise<{ eventId: string; applicationId: string }> }
) {
  const { eventId, applicationId } = await context.params;
  
  try {
    // Verify application belongs to this event
    const application = await db.application.findFirst({
      where: {
        id: applicationId,
        eventId: eventId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            jobTitle: true,
          }
        },
        event: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
        responses: {
          include: {
            question: {
              select: {
                questionKey: true,
                questionEn: true,
                questionType: true,
                order: true,
              }
            }
          },
          orderBy: {
            question: { order: "asc" }
          }
        }
      }
    });

    if (!application) {
      return Response.json(
        { success: false, error: "Application not found or doesn't belong to this event" },
        { status: 404 }
      );
    }

    // Get complete evaluation history for this application
    const evaluations = await db.applicationEvaluation.findMany({
      where: {
        applicationId: applicationId,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            reviewerCompetencies: {
              select: {
                category: true,
                competencyLevel: true,
                baseWeight: true,
              }
            }
          }
        },
        scores: {
          include: {
            criteria: {
              select: {
                id: true,
                name: true,
                description: true,
                category: true,
                weight: true,
                minScore: true,
                maxScore: true,
                order: true,
              }
            }
          },
          orderBy: {
            criteria: { order: "asc" }
          }
        },
        comments: {
          select: {
            id: true,
            questionKey: true,
            comment: true,
            isPrivate: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    // Get any consensus decisions for this application
    const consensus = await db.consensusDecision.findFirst({
      where: {
        applicationId: applicationId,
      },
      include: {
        decidedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    // Transform evaluations with detailed history
    const evaluationHistory = evaluations.map(evaluation => {
      const isAIReviewer = evaluation.reviewer.email === "ai-reviewer@fundingthecommons.io";
      
      return {
        id: evaluation.id,
        reviewer: {
          id: evaluation.reviewer.id,
          name: evaluation.reviewer.name,
          email: evaluation.reviewer.email,
          role: evaluation.reviewer.role,
          isAI: isAIReviewer,
          competencies: evaluation.reviewer.reviewerCompetencies?.map(comp => ({
            category: comp.category,
            level: comp.competencyLevel,
            weight: comp.baseWeight,
          })) ?? [],
        },
        evaluation: {
          stage: evaluation.stage,
          status: evaluation.status,
          overallScore: evaluation.overallScore,
          confidence: evaluation.confidence,
          recommendation: evaluation.recommendation,
          overallComments: evaluation.overallComments,
          timeSpentMinutes: evaluation.timeSpentMinutes,
          videoWatched: evaluation.videoWatched,
          videoQuality: evaluation.videoQuality,
          createdAt: evaluation.createdAt,
          completedAt: evaluation.completedAt,
          updatedAt: evaluation.updatedAt,
        },
        scores: evaluation.scores.map(score => ({
          criteriaId: score.criteriaId,
          criteriaName: score.criteria.name,
          criteriaDescription: score.criteria.description,
          criteriaCategory: score.criteria.category,
          criteriaWeight: score.criteria.weight,
          scoreRange: {
            min: score.criteria.minScore,
            max: score.criteria.maxScore,
          },
          score: score.score,
          normalizedScore: (score.score - score.criteria.minScore) / 
                          (score.criteria.maxScore - score.criteria.minScore),
          reasoning: score.reasoning,
          createdAt: score.createdAt,
          updatedAt: score.updatedAt,
        })),
        comments: evaluation.comments.map(comment => ({
          id: comment.id,
          questionKey: comment.questionKey,
          comment: comment.comment,
          isPrivate: comment.isPrivate,
          createdAt: comment.createdAt,
        })),
        // AI metadata if available
        aiMetadata: isAIReviewer && evaluation.internalNotes 
          ? JSON.parse(evaluation.internalNotes) 
          : null,
      };
    });

    // Calculate evaluation analytics
    const analytics = {
      totalEvaluations: evaluations.length,
      completedEvaluations: evaluations.filter(e => e.status === "COMPLETED").length,
      uniqueReviewers: new Set(evaluations.map(e => e.reviewerId)).size,
      aiEvaluations: evaluations.filter(e => e.reviewer.email === "ai-reviewer@fundingthecommons.io").length,
      humanEvaluations: evaluations.filter(e => e.reviewer.email !== "ai-reviewer@fundingthecommons.io").length,
      
      scoreAnalysis: {
        averageOverallScore: evaluations
          .filter(e => e.overallScore !== null)
          .reduce((sum, e, _, arr) => sum + (e.overallScore! / arr.length), 0) || null,
        scoreRange: {
          min: Math.min(...evaluations.map(e => e.overallScore).filter(Boolean) as number[]),
          max: Math.max(...evaluations.map(e => e.overallScore).filter(Boolean) as number[]),
        },
        scoreVariance: evaluations.length > 1 ? calculateVariance(
          evaluations.map(e => e.overallScore).filter(Boolean) as number[]
        ) : 0,
      },
      
      recommendationConsensus: evaluations
        .map(e => e.recommendation)
        .filter(Boolean)
        .reduce((acc, rec) => {
          acc[rec!] = (acc[rec!] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      
      confidenceAnalysis: {
        averageConfidence: evaluations
          .filter(e => e.confidence !== null)
          .reduce((sum, e, _, arr) => sum + (e.confidence! / arr.length), 0) || null,
        confidenceDistribution: evaluations
          .map(e => e.confidence)
          .filter(Boolean)
          .reduce((acc, conf) => {
            acc[conf!] = (acc[conf!] ?? 0) + 1;
            return acc;
          }, {} as Record<number, number>),
      },
      
      timeAnalysis: {
        averageTimeSpent: evaluations
          .filter(e => e.timeSpentMinutes !== null)
          .reduce((sum, e, _, arr) => sum + (e.timeSpentMinutes! / arr.length), 0) || null,
        totalTimeSpent: evaluations
          .map(e => e.timeSpentMinutes)
          .filter(Boolean)
          .reduce((sum, time) => sum + time!, 0),
      },
      
      timeline: {
        firstEvaluation: evaluations[0]?.createdAt,
        lastEvaluation: evaluations[evaluations.length - 1]?.completedAt,
        evaluationDuration: evaluations.length > 0 && evaluations[0].createdAt && evaluations[evaluations.length - 1]?.completedAt
          ? new Date(evaluations[evaluations.length - 1].completedAt!).getTime() - 
            new Date(evaluations[0].createdAt).getTime()
          : null,
      }
    };

    // Identify evaluation patterns and insights
    const insights = {
      reviewerAgreement: calculateReviewerAgreement(evaluations),
      biasIndicators: detectBiasIndicators(evaluationHistory),
      qualityFlags: detectQualityFlags(evaluations),
      urgencyLevel: determineUrgencyLevel(evaluations, application.status),
      nextRecommendedActions: getNextRecommendedActions(evaluations, application.status, consensus),
    };

    return Response.json({
      success: true,
      data: {
        eventId,
        application: {
          id: application.id,
          userId: application.userId,
          status: application.status,
          language: application.language,
          isComplete: application.isComplete,
          submittedAt: application.submittedAt,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt,
        },
        applicant: application.user,
        event: application.event,
        responses: application.responses.map(response => ({
          questionKey: response.question.questionKey,
          questionText: response.question.questionEn,
          questionType: response.question.questionType,
          answer: response.answer,
          order: response.question.order,
        })),
        evaluationHistory,
        consensus: consensus ? {
          id: consensus.id,
          finalDecision: consensus.finalDecision,
          consensusScore: consensus.consensusScore,
          discussionNotes: consensus.discussionNotes,
          decidedBy: consensus.decidedBy,
          decidedAt: consensus.decidedAt,
          createdAt: consensus.createdAt,
        } : null,
        analytics,
        insights,
        metadata: {
          generatedAt: new Date().toISOString(),
          purpose: "Complete evaluation history for single application analysis",
          dataCompleteness: `${evaluations.length} evaluations with full scoring and comments`,
        }
      }
    });

  } catch (error) {
    console.error("[MASTRA API] Error fetching evaluation history:", error);
    
    return Response.json(
      { 
        success: false, 
        error: "Failed to fetch evaluation history",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

// Helper functions
function calculateVariance(numbers: number[]): number {
  if (numbers.length < 2) return 0;
  const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  return numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
}

function calculateReviewerAgreement(evaluations: any[]): number {
  if (evaluations.length < 2) return 100;
  
  const recommendations = evaluations.map(e => e.recommendation).filter(Boolean);
  const scores = evaluations.map(e => e.overallScore).filter(Boolean) as number[];
  
  // Simple agreement calculation
  const recAgreement = new Set(recommendations).size === 1 ? 100 : 0;
  const scoreVariance = scores.length > 1 ? Math.sqrt(calculateVariance(scores)) : 0;
  const scoreAgreement = scoreVariance < 10 ? 100 - scoreVariance : 0;
  
  return (recAgreement + scoreAgreement) / 2;
}

function detectBiasIndicators(evaluationHistory: any[]): string[] {
  const indicators: string[] = [];
  
  const aiEvals = evaluationHistory.filter(e => e.reviewer.isAI);
  const humanEvals = evaluationHistory.filter(e => !e.reviewer.isAI);
  
  if (aiEvals.length > 0 && humanEvals.length > 0) {
    const aiAvgScore = aiEvals.reduce((sum, e) => sum + (e.evaluation.overallScore ?? 0), 0) / aiEvals.length;
    const humanAvgScore = humanEvals.reduce((sum, e) => sum + (e.evaluation.overallScore ?? 0), 0) / humanEvals.length;
    
    if (Math.abs(aiAvgScore - humanAvgScore) > 15) {
      indicators.push("Significant AI-Human scoring divergence detected");
    }
  }
  
  return indicators;
}

function detectQualityFlags(evaluations: any[]): string[] {
  const flags: string[] = [];
  
  const rapidEvals = evaluations.filter(e => e.timeSpentMinutes && e.timeSpentMinutes < 5);
  if (rapidEvals.length > 0) {
    flags.push(`${rapidEvals.length} rapid evaluation(s) detected (< 5 minutes)`);
  }
  
  const incompleteEvals = evaluations.filter(e => e.status !== "COMPLETED");
  if (incompleteEvals.length > 0) {
    flags.push(`${incompleteEvals.length} incomplete evaluation(s)`);
  }
  
  return flags;
}

function determineUrgencyLevel(evaluations: any[], status: string): 'low' | 'medium' | 'high' {
  if (status === "UNDER_REVIEW" && evaluations.length === 0) return 'high';
  if (status === "UNDER_REVIEW" && evaluations.filter(e => e.status === "COMPLETED").length < 2) return 'medium';
  return 'low';
}

function getNextRecommendedActions(evaluations: any[], status: string, consensus: any): string[] {
  const actions: string[] = [];
  
  if (evaluations.length === 0) {
    actions.push("Assign initial reviewers");
  } else if (evaluations.filter(e => e.status === "COMPLETED").length < 2) {
    actions.push("Assign additional reviewers for cross-validation");
  } else if (!consensus && status === "UNDER_REVIEW") {
    actions.push("Review for consensus decision");
  }
  
  const scores = evaluations.map(e => e.overallScore).filter(Boolean) as number[];
  if (scores.length > 1 && Math.sqrt(calculateVariance(scores)) > 15) {
    actions.push("Resolve scoring discrepancies between reviewers");
  }
  
  return actions;
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };