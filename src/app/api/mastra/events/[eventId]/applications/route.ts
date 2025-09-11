import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";

async function GET(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  
  try {
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

    return Response.json({
      success: true,
      data: {
        eventId,
        applications: transformedApplications,
        totalCount: transformedApplications.length,
        metadata: {
          generatedAt: new Date().toISOString(),
          purpose: "AI ranking and evaluation",
        }
      }
    });

  } catch (error) {
    console.error("[MASTRA API] Error fetching applications:", error);
    
    return Response.json(
      { 
        success: false, 
        error: "Failed to fetch applications",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };