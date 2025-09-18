import { withMastraAuth } from "~/utils/validateApiKey";
import { testConnection } from "~/lib/mastra/database";

async function GET() {
  try {
    const result = await testConnection();
    return Response.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("[MASTRA API] Error in test endpoint:", error);
    
    return Response.json(
      { 
        success: false, 
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };