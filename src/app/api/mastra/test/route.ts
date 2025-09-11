import { withMastraAuth } from "~/utils/validateApiKey";

async function GET() {
  return Response.json({
    success: true,
    message: "Authentication successful!",
    timestamp: new Date().toISOString(),
  });
}

const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };