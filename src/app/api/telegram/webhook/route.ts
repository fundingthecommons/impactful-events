import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import * as Sentry from "@sentry/nextjs";
import { crossPostPraiseToChannel } from "~/server/services/praiseChannelService";

/**
 * Telegram Bot Webhook Handler
 *
 * Receives updates from Telegram Bot API and processes praise commands.
 *
 * Command format: !Praise @username for doing something amazing
 */

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

/**
 * Parse praise command from message text
 * Format: !Praise @username for message content
 */
function parsePraiseCommand(text: string): {
  recipientUsername: string;
  message: string;
} | null {
  // Match pattern: !Praise @username for message
  const praiseRegex = /^!praise\s+@(\w+)\s+for\s+(.+)$/i;
  const match = praiseRegex.exec(text);

  if (!match) {
    return null;
  }

  return {
    recipientUsername: match[1]!.toLowerCase(),
    message: match[2]!.trim(),
  };
}

/**
 * Find user by Telegram information
 */
async function findUserByTelegram(
  telegramId: number,
  username?: string,
): Promise<{ id: string; name: string | null } | null> {
  // Try to find by Contact with matching telegramId
  const contact = await db.contact.findFirst({
    where: {
      telegram: username ?? undefined,
    },
  });

  if (contact) {
    // Contact exists, but we need to map to User
    // This is tricky - contacts don't have userId
    // We'll need to search by name or other identifier
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: contact.email },
          {
            name: {
              contains: `${contact.firstName} ${contact.lastName}`,
              mode: "insensitive",
            },
          },
        ],
      },
    });

    if (user) {
      return { id: user.id, name: user.name };
    }
  }

  // Try to find by TelegramAuth
  // Note: TelegramAuth doesn't store telegram user ID, only session info
  // We need to rely on username matching

  // Try to find user by name/username matching
  if (username) {
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: { contains: username, mode: "insensitive" } },
          { name: { contains: username, mode: "insensitive" } },
        ],
      },
    });

    if (user) {
      return { id: user.id, name: user.name };
    }
  }

  return null;
}

/**
 * Find recipient user by username
 */
async function findRecipientByUsername(
  username: string,
): Promise<{ id: string; name: string | null } | null> {
  // First try exact match on Contact telegram field
  const contact = await db.contact.findFirst({
    where: {
      telegram: {
        equals: username,
        mode: "insensitive",
      },
    },
  });

  if (contact?.email) {
    const user = await db.user.findFirst({
      where: { email: contact.email },
    });
    if (user) {
      return { id: user.id, name: user.name };
    }
  }

  // Try matching User by name
  const user = await db.user.findFirst({
    where: {
      name: {
        contains: username,
        mode: "insensitive",
      },
    },
  });

  if (user) {
    return { id: user.id, name: user.name };
  }

  return null;
}

/**
 * Send reply message via Telegram Bot API
 */
async function sendTelegramReply(chatId: number, text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN not configured");
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "Markdown",
        }),
      },
    );

    if (!response.ok) {
      const error = (await response.json()) as { description?: string };
      throw new Error(
        `Telegram API error: ${error.description ?? response.statusText}`,
      );
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: "telegram_bot_reply" },
      extra: { chatId, text },
    });
    console.error("Failed to send Telegram reply:", error);
  }
}

/**
 * Process praise command
 */
async function processPraiseCommand(
  message: TelegramMessage,
  praiseData: { recipientUsername: string; message: string },
): Promise<string> {
  const { recipientUsername, message: praiseMessage } = praiseData;

  // Find sender
  const sender = await findUserByTelegram(
    message.from.id,
    message.from.username,
  );

  if (!sender) {
    return `Sorry, I couldn't find your user account. Make sure you're registered in the platform.`;
  }

  // Find recipient
  const recipient = await findRecipientByUsername(recipientUsername);

  // Create praise record
  try {
    const praise = await db.praise.create({
      data: {
        senderId: sender.id,
        senderTelegramId: BigInt(message.from.id),
        recipientId: recipient?.id ?? null,
        recipientName: recipientUsername,
        message: praiseMessage,
        telegramMsgId: message.message_id.toString(),
        isPublic: false, // Default to private
      },
    });

    // Log successful praise
    Sentry.addBreadcrumb({
      category: "praise",
      message: "Praise created",
      data: {
        praiseId: praise.id,
        senderId: sender.id,
        recipientId: recipient?.id ?? "unknown",
        recipientName: recipientUsername,
      },
      level: "info",
    });

    // Cross-post to channel anonymously (non-blocking)
    const channelResult = await crossPostPraiseToChannel(
      recipientUsername,
      praiseMessage,
    );

    // Update praise record with channel message ID if successful
    if (channelResult.success && channelResult.messageId) {
      await db.praise.update({
        where: { id: praise.id },
        data: {
          channelMessageId: channelResult.messageId,
          crossPostedAt: new Date(),
        },
      });
    }

    const recipientDisplay = recipient?.name ?? `@${recipientUsername}`;
    return `✅ Praise recorded! You praised ${recipientDisplay} for: "${praiseMessage}"`;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: "create_praise" },
      extra: {
        senderId: sender.id,
        recipientUsername,
        praiseMessage,
      },
    });

    console.error("Failed to create praise:", error);
    return "Sorry, something went wrong while recording your praise. Please try again.";
  }
}

/**
 * POST /api/telegram/webhook
 *
 * Webhook endpoint for Telegram Bot API
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook token (optional security measure)
    const webhookToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    const expectedToken = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (expectedToken && webhookToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update = (await request.json()) as TelegramUpdate;

    // Only process text messages
    if (!update.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const text = message.text ?? "";

    // Check if it's a praise command
    const praiseData = parsePraiseCommand(text);

    if (praiseData) {
      const replyText = await processPraiseCommand(message, praiseData);
      await sendTelegramReply(message.chat.id, replyText);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: "telegram_webhook" },
    });

    console.error("Telegram webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/telegram/webhook
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Telegram praise bot webhook is running",
  });
}
