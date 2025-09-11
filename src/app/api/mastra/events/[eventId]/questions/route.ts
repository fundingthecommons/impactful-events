import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";

async function GET(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  
  try {
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

    return Response.json({
      success: true,
      data: {
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
      }
    });

  } catch (error) {
    console.error("[MASTRA API] Error fetching questions:", error);
    
    return Response.json(
      { 
        success: false, 
        error: "Failed to fetch questions",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };