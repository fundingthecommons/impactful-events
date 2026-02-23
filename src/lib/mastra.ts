import { MastraClient } from "@mastra/client-js";
import { env } from "~/env";

const mastraServerUrl =
  env.MASTRA_SERVER_URL ?? "https://mastra-production.up.railway.app";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- @mastra/client-js has broken transitive type deps on @ai-sdk/provider v1 types
export const mastraClient = new MastraClient({
  baseUrl: mastraServerUrl,
  headers: {
    "x-api-key": env.MASTRA_API_KEY,
  },
});
