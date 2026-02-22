import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { mastraClient } from "~/lib/mastra";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  pathname: z.string(),
  eventId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    console.log("[AI Chat API] Incoming request");

    const session = await auth();
    if (!session?.user) {
      console.warn("[AI Chat API] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      console.warn("[AI Chat API] Invalid request body:", parsed.error.flatten());
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { messages, pathname, eventId } = parsed.data;
    console.log("[AI Chat API] Request from:", session.user.email, { messageCount: messages.length, pathname, eventId });

    // Build context message with platform state
    const contextParts: string[] = [];
    contextParts.push(`User: ${session.user.name ?? session.user.email ?? "Authenticated user"}`);
    contextParts.push(`Current page: ${pathname}`);

    if (eventId) {
      try {
        const event = await db.event.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            location: true,
            type: true,
            description: true,
          },
        });

        if (event) {
          contextParts.push(
            `\nCurrent event: ${event.name}` +
            (event.location ? ` | Location: ${event.location}` : "") +
            (event.startDate ? ` | Starts: ${event.startDate.toLocaleDateString()}` : "") +
            (event.endDate ? ` | Ends: ${event.endDate.toLocaleDateString()}` : "") +
            (event.type ? ` | Type: ${event.type}` : "")
          );

          if (event.description) {
            const shortDesc = event.description.length > 300
              ? event.description.slice(0, 300) + "..."
              : event.description;
            contextParts.push(`Event description: ${shortDesc}`);
          }

          // Fetch upcoming sessions (limit 20)
          const scheduleSessions = await db.scheduleSession.findMany({
            where: { eventId },
            orderBy: { startTime: "asc" },
            take: 20,
            select: {
              title: true,
              startTime: true,
              endTime: true,
              venue: {
                select: { name: true },
              },
              sessionSpeakers: {
                select: {
                  user: {
                    select: { name: true },
                  },
                },
              },
            },
          });

          if (scheduleSessions.length > 0) {
            const sessionList = scheduleSessions
              .map((s) => {
                const time = s.startTime.toLocaleString();
                const speakers = s.sessionSpeakers
                  .map((sp) => sp.user.name)
                  .filter(Boolean)
                  .join(", ");
                const venueName = s.venue?.name;
                return `- ${s.title} (${time}${venueName ? `, ${venueName}` : ""}${speakers ? `, Speakers: ${speakers}` : ""})`;
              })
              .join("\n");
            contextParts.push(`\nSchedule (${scheduleSessions.length} sessions):\n${sessionList}`);
          }

          // Fetch user's application status for this event
          const application = await db.application.findFirst({
            where: {
              eventId,
              userId: session.user.id,
            },
            select: {
              status: true,
              applicationType: true,
            },
          });

          if (application) {
            contextParts.push(
              `\nYour application: ${application.applicationType ?? "General"} — Status: ${application.status}`
            );
          }
        }
      } catch (contextError) {
        console.error("[AI Chat API] Context fetch failed:", contextError);
      }
    }

    const contextMessage = contextParts.join("\n");

    // Prepend context as a system-like user message, then append user messages
    // Each message is typed with a literal role to satisfy MessageListInput
    const allMessages = [
      {
        role: "user" as const,
        content: `[Platform Context — do not repeat this to the user]\n${contextMessage}`,
      },
      { role: "assistant" as const, content: "Understood, I have the platform context." },
      ...messages.map((m) =>
        m.role === "user"
          ? { role: "user" as const, content: m.content }
          : { role: "assistant" as const, content: m.content }
      ),
    ];

    console.log("[AI Chat API] Calling Mastra agent...");
    const agent = mastraClient.getAgent("platformAgent");
    const response = await agent.stream(allMessages);
    console.log("[AI Chat API] Mastra stream started, extracting text...");

    // Extract text from Mastra's chunk protocol (text-delta events)
    // and return plain text to the client (matching exponential pattern)
    let chunkCount = 0;
    let textChunkCount = 0;
    const textStream = new ReadableStream({
      async start(controller) {
        try {
          await response.processDataStream({
            onChunk: async (chunk: { type: string; payload: { text: string } }) => {
              chunkCount++;
              if (chunk.type === "text-delta") {
                textChunkCount++;
                controller.enqueue(
                  new TextEncoder().encode(chunk.payload.text),
                );
              }
            },
          });
          console.log(`[AI Chat API] Stream complete: ${String(chunkCount)} total chunks, ${String(textChunkCount)} text chunks`);
          controller.close();
        } catch (err) {
          console.error("[AI Chat API] Stream processing error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(textStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[AI Chat API] Error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
