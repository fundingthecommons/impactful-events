import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";

async function GET(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  
  try {
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
      return Response.json(
        { 
          success: false, 
          error: "Event not found" 
        }, 
        { status: 404 }
      );
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

    return Response.json({
      success: true,
      data: {
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
      }
    });

  } catch (error) {
    console.error("[MASTRA API] Error fetching criteria:", error);
    
    return Response.json(
      { 
        success: false, 
        error: "Failed to fetch evaluation criteria",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
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

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };