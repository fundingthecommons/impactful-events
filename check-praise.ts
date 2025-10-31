import { db } from "./src/server/db";

async function checkPraise() {
  const praises = await db.praise.findMany({
    include: {
      sender: {
        select: {
          name: true,
          email: true,
        },
      },
      recipient: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  console.log("\n📊 Recent Praise:\n");

  if (praises.length === 0) {
    console.log("❌ No praise found in database");
    console.log("\nPossible reasons:");
    console.log("1. Webhook not set up correctly");
    console.log("2. Bot didn't recognize the command format");
    console.log("3. Sender or recipient user not found in database");
    console.log("\nCheck Vercel logs for errors: https://vercel.com/dashboard");
  } else {
    praises.forEach((praise, index) => {
      console.log(`${index + 1}. ${praise.sender?.name ?? "Unknown"} → ${praise.recipient?.name ?? `@${praise.recipientName}`}`);
      console.log(`   Message: "${praise.message}"`);
      console.log(`   Created: ${praise.createdAt.toISOString()}`);
      console.log(`   Telegram ID: ${praise.senderTelegramId?.toString() ?? "N/A"}`);
      console.log("");
    });
  }

  await db.$disconnect();
}

checkPraise().catch(console.error);
