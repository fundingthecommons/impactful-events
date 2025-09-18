#!/usr/bin/env bun

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
} from "@modelcontextprotocol/sdk/types.js";
import {
  testConnection,
  getEventApplications,
  getEventEvaluations,
  getEvaluationCriteria,
  getApplicationQuestions,
} from "../src/lib/mastra/database.js";
import { validateMastraApiKey } from "../src/utils/validateApiKey.js";

class MastraServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "ftc-mastra",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "test_connection",
            description: "Test MCP server connection and verify it's working properly",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
            },
          },
          {
            name: "get_event_applications",
            description: "Get all applications for a specific event with complete data for AI analysis and ranking",
            inputSchema: {
              type: "object",
              properties: {
                eventId: {
                  type: "string",
                  description: "The ID of the event to fetch applications for",
                },
              },
              required: ["eventId"],
            },
          },
          {
            name: "get_event_evaluations",
            description: "Get completed evaluations for applications in a specific event with scores, comments, and statistics",
            inputSchema: {
              type: "object",
              properties: {
                eventId: {
                  type: "string",
                  description: "The ID of the event to fetch evaluations for",
                },
              },
              required: ["eventId"],
            },
          },
          {
            name: "get_evaluation_criteria",
            description: "Get evaluation criteria categorized for AI understanding and application scoring",
            inputSchema: {
              type: "object",
              properties: {
                eventId: {
                  type: "string",
                  description: "The ID of the event to get criteria context for",
                },
              },
              required: ["eventId"],
            },
          },
          {
            name: "get_application_questions",
            description: "Get application questions structure and metadata for AI understanding of application format",
            inputSchema: {
              type: "object",
              properties: {
                eventId: {
                  type: "string",
                  description: "The ID of the event to fetch questions for",
                },
              },
              required: ["eventId"],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "test_connection": {
            const result = await testConnection();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "get_event_applications": {
            const { eventId } = args as { eventId: string };
            if (!eventId) {
              throw new Error("eventId is required");
            }

            const result = await getEventApplications(eventId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "get_event_evaluations": {
            const { eventId } = args as { eventId: string };
            if (!eventId) {
              throw new Error("eventId is required");
            }

            const result = await getEventEvaluations(eventId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "get_evaluation_criteria": {
            const { eventId } = args as { eventId: string };
            if (!eventId) {
              throw new Error("eventId is required");
            }

            const result = await getEvaluationCriteria(eventId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "get_application_questions": {
            const { eventId } = args as { eventId: string };
            if (!eventId) {
              throw new Error("eventId is required");
            }

            const result = await getApplicationQuestions(eventId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: errorMessage,
                details: `Failed to execute tool: ${name}`,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error("FTC Mastra MCP Server running on stdio");
  }
}

// Start the server
const server = new MastraServer();
server.run().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});