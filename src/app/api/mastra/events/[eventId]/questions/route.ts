import type { NextRequest } from "next/server";
import { withMastraAuth } from "~/utils/validateApiKey";
import { getApplicationQuestions } from "~/lib/mastra/database";

async function GET(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  
  try {
    const data = await getApplicationQuestions(eventId);
    return Response.json({
      success: true,
      data
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