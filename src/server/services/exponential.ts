import { env } from "~/env";

interface CreateActionInput {
  name: string;
  projectId: string;
  priority?: string;
  source?: string;
  parseNaturalLanguage?: boolean;
}

interface CreateActionResponse {
  result: {
    data: {
      json: {
        success: boolean;
        action: {
          id: string;
          name: string;
          url: string;
        };
        url: string;
      };
    };
  };
}

interface SaveScreenshotInput {
  actionId: string;
  screenshot: string;
  timestamp: string;
}

interface SaveScreenshotResponse {
  result: {
    data: {
      json: {
        success: boolean;
        url: string;
      };
    };
  };
}

const EXPONENTIAL_BASE_URL = "https://www.exponential.im/api/trpc";

export async function createExponentialAction(
  input: CreateActionInput,
): Promise<{ id: string; url: string }> {
  const apiKey = env.EXPONENTIAL_API_KEY;
  if (!apiKey) {
    throw new Error("EXPONENTIAL_API_KEY is not configured");
  }

  const response = await fetch(`${EXPONENTIAL_BASE_URL}/action.quickCreate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ json: input }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Exponential API error (${String(response.status)}): ${text}`,
    );
  }

  const data = (await response.json()) as CreateActionResponse;
  return {
    id: data.result.data.json.action.id,
    url: data.result.data.json.url,
  };
}

export async function saveExponentialScreenshot(
  input: SaveScreenshotInput,
): Promise<string> {
  const apiKey = env.EXPONENTIAL_API_KEY;
  if (!apiKey) {
    throw new Error("EXPONENTIAL_API_KEY is not configured");
  }

  const response = await fetch(
    `${EXPONENTIAL_BASE_URL}/action.saveScreenshot`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ json: input }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Exponential screenshot API error (${String(response.status)}): ${text}`,
    );
  }

  const data = (await response.json()) as SaveScreenshotResponse;
  return data.result.data.json.url;
}
