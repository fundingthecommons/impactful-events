import { db } from "~/server/db";

/**
 * Test connection to verify MCP server is working
 */
export async function testConnection() {
  return {
    success: true,
    message: "MCP connection successful!",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get all applications for a specific event with complete data for AI analysis
 */
export async function getEventApplications(eventId: string) {
  // Get all applications for the event with complete data needed for ranking
  const applications = await db.application.findMany({
    where: {
      eventId,
      status: {
        in: ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED"]
      }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      event: {
        select: {
          id: true,
          name: true,
          description: true,
          startDate: true,
          endDate: true,
        },
      },
      responses: {
        include: {
          question: {
            select: {
              id: true,
              questionKey: true,
              questionEn: true,
              questionEs: true,
              questionType: true,
              required: true,
              order: true,
            },
          },
        },
        orderBy: {
          question: {
            order: "asc",
          },
        },
      },
    },
    orderBy: { 
      submittedAt: "desc" 
    },
  });

  // Transform the data for AI agent consumption
  const transformedApplications = applications.map(app => ({
    id: app.id,
    userId: app.userId,
    eventId: app.eventId,
    status: app.status,
    language: app.language,
    isComplete: app.isComplete,
    submittedAt: app.submittedAt,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    applicant: app.user,
    event: app.event,
    responses: app.responses.map(response => ({
      questionId: response.questionId,
      questionKey: response.question.questionKey,
      questionText: response.question.questionEn, // Default to English, could be made dynamic
      questionType: response.question.questionType,
      required: response.question.required,
      answer: response.answer,
      order: response.question.order,
    })),
    // Add helpful computed fields
    responseCount: app.responses.length,
    completionPercentage: app.isComplete ? 100 : Math.round((app.responses.length / Math.max(app.responses.length, 1)) * 100),
  }));

  return {
    eventId,
    applications: transformedApplications,
    totalCount: transformedApplications.length,
    metadata: {
      generatedAt: new Date().toISOString(),
      purpose: "AI ranking and evaluation",
    }
  };
}

/**
 * Get completed evaluations for applications in a specific event
 */
export async function getEventEvaluations(eventId: string) {
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
    throw new Error("Event not found");
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

  return {
    eventId,
    event,
    evaluations: transformedEvaluations,
    statistics,
    metadata: {
      generatedAt: new Date().toISOString(),
      purpose: "AI analysis of existing human evaluations",
      usage: "Analyze patterns in human evaluations to improve AI ranking accuracy",
    }
  };
}

/**
 * Get evaluation criteria for a specific event (criteria are global but contextual to event)
 */
export async function getEvaluationCriteria(eventId: string) {
  // Get all active evaluation criteria (these are global, not event-specific in current schema)
  const criteria = await db.evaluationCriteria.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      order: "asc",
    },
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
    throw new Error("Event not found");
  }

  // Transform criteria for AI agent understanding
  const transformedCriteria = criteria.map(criterion => ({
    id: criterion.id,
    name: criterion.name,
    description: criterion.description,
    category: criterion.category,
    weight: criterion.weight,
    scoreRange: {
      min: criterion.minScore,
      max: criterion.maxScore,
      range: criterion.maxScore - criterion.minScore + 1
    },
    order: criterion.order,
    isActive: criterion.isActive,
    createdAt: criterion.createdAt,
    updatedAt: criterion.updatedAt,
    // Helper fields for AI understanding
    categoryDescription: getCategoryDescription(criterion.category),
    scoringGuidance: `Score from ${criterion.minScore} to ${criterion.maxScore}, where ${criterion.minScore} is poor and ${criterion.maxScore} is excellent`,
  }));

  // Group criteria by category for better AI understanding
  const categorizedCriteria = {
    TECHNICAL: transformedCriteria.filter(c => c.category === "TECHNICAL"),
    PROJECT: transformedCriteria.filter(c => c.category === "PROJECT"), 
    COMMUNITY_FIT: transformedCriteria.filter(c => c.category === "COMMUNITY_FIT"),
    VIDEO: transformedCriteria.filter(c => c.category === "VIDEO"),
    OVERALL: transformedCriteria.filter(c => c.category === "OVERALL"),
  };

  // Calculate total possible score and weighted score
  const totalMaxScore = transformedCriteria.reduce((sum, criterion) => sum + criterion.scoreRange.max, 0);
  const weightedMaxScore = transformedCriteria.reduce((sum, criterion) => sum + (criterion.scoreRange.max * criterion.weight), 0);

  return {
    eventId,
    event,
    criteria: transformedCriteria,
    categorizedCriteria,
    totalCount: transformedCriteria.length,
    scoring: {
      totalMaxScore,
      weightedMaxScore,
      averageWeight: transformedCriteria.reduce((sum, c) => sum + c.weight, 0) / transformedCriteria.length,
      categoryWeights: {
        TECHNICAL: categorizedCriteria.TECHNICAL.reduce((sum, c) => sum + c.weight, 0),
        PROJECT: categorizedCriteria.PROJECT.reduce((sum, c) => sum + c.weight, 0),
        COMMUNITY_FIT: categorizedCriteria.COMMUNITY_FIT.reduce((sum, c) => sum + c.weight, 0),
        VIDEO: categorizedCriteria.VIDEO.reduce((sum, c) => sum + c.weight, 0),
        OVERALL: categorizedCriteria.OVERALL.reduce((sum, c) => sum + c.weight, 0),
      }
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      purpose: "AI ranking criteria for application evaluation",
      usage: "Use these criteria to score each application and rank them accordingly",
    }
  };
}

/**
 * Get application questions for a specific event
 */
export async function getApplicationQuestions(eventId: string) {
  // Get all application questions for the event
  const questions = await db.applicationQuestion.findMany({
    where: {
      eventId,
    },
    orderBy: {
      order: "asc",
    },
  });

  // Transform the questions for AI agent understanding
  const transformedQuestions = questions.map(question => ({
    id: question.id,
    eventId: question.eventId,
    order: question.order,
    questionKey: question.questionKey,
    questionText: {
      en: question.questionEn,
      es: question.questionEs,
    },
    questionType: question.questionType,
    required: question.required,
    options: question.options, // For SELECT/MULTISELECT questions
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
    // Helper fields for AI understanding
    isMultipleChoice: question.questionType === "SELECT" || question.questionType === "MULTISELECT",
    isTextInput: question.questionType === "TEXT" || question.questionType === "TEXTAREA",
    isContactInfo: question.questionType === "EMAIL" || question.questionType === "PHONE",
    maxOptions: question.options?.length ?? 0,
  }));

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

  return {
    eventId,
    event,
    questions: transformedQuestions,
    totalCount: transformedQuestions.length,
    questionTypes: {
      TEXT: transformedQuestions.filter(q => q.questionType === "TEXT").length,
      TEXTAREA: transformedQuestions.filter(q => q.questionType === "TEXTAREA").length,
      EMAIL: transformedQuestions.filter(q => q.questionType === "EMAIL").length,
      PHONE: transformedQuestions.filter(q => q.questionType === "PHONE").length,
      URL: transformedQuestions.filter(q => q.questionType === "URL").length,
      SELECT: transformedQuestions.filter(q => q.questionType === "SELECT").length,
      MULTISELECT: transformedQuestions.filter(q => q.questionType === "MULTISELECT").length,
      CHECKBOX: transformedQuestions.filter(q => q.questionType === "CHECKBOX").length,
      NUMBER: transformedQuestions.filter(q => q.questionType === "NUMBER").length,
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      purpose: "AI understanding of application structure",
      totalRequired: transformedQuestions.filter(q => q.required).length,
      totalOptional: transformedQuestions.filter(q => !q.required).length,
    }
  };
}

function getCategoryDescription(category: string): string {
  const descriptions = {
    TECHNICAL: "Technical skills, programming experience, and technical project quality",
    PROJECT: "Project viability, innovation, feasibility, and potential impact", 
    COMMUNITY_FIT: "Alignment with community values, culture fit, and collaboration potential",
    VIDEO: "Video presentation quality, communication skills, and clarity of vision",
    OVERALL: "Overall impression, gut feeling, and holistic assessment"
  };
  return descriptions[category as keyof typeof descriptions] ?? "General evaluation category";
}