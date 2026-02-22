import { MastraClient } from "@mastra/client-js";
import { env } from "~/env";

const mastraServerUrl =
  env.MASTRA_SERVER_URL ?? "https://mastra-production.up.railway.app";

export const mastraClient = new MastraClient({
  baseUrl: mastraServerUrl,
  headers: {
    "x-api-key": env.MASTRA_API_KEY,
  },
});
