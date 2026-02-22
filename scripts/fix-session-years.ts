import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixSessionYears() {
  const dryRun = !process.argv.includes("--apply");

  console.log(dryRun ? "🔍 DRY RUN (pass --apply to commit changes)\n" : "🔧 APPLYING FIXES\n");

  // Find the event
  const event = await prisma.event.findFirst({
    where: { slug: "intelligence-at-the-frontier" },
    select: { id: true, name: true, startDate: true, endDate: true },
  });

  if (!event) {
    console.log("❌ Event not found");
    return;
  }

  const eventYear = event.startDate.getUTCFullYear();
  console.log(`Event: ${event.name}`);
  console.log(`Event dates: ${event.startDate.toISOString()} – ${event.endDate.toISOString()}`);
  console.log(`Expected year: ${String(eventYear)}\n`);

  // Get all sessions for this event
  const sessions = await prisma.scheduleSession.findMany({
    where: { eventId: event.id },
    select: { id: true, title: true, startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
  });

  console.log(`Total sessions: ${String(sessions.length)}\n`);

  const wrongYear: typeof sessions = [];
  const correctYear: typeof sessions = [];

  for (const session of sessions) {
    const sessionYear = session.startTime.getUTCFullYear();
    if (sessionYear !== eventYear) {
      wrongYear.push(session);
    } else {
      correctYear.push(session);
    }
  }

  console.log(`Sessions with correct year (${String(eventYear)}): ${String(correctYear.length)}`);
  console.log(`Sessions with wrong year: ${String(wrongYear.length)}\n`);

  if (wrongYear.length === 0) {
    console.log("✅ All sessions have the correct year. Nothing to fix.");
    return;
  }

  console.log("Sessions with wrong year:");
  console.log("─".repeat(80));

  for (const session of wrongYear) {
    const oldStart = session.startTime;
    const oldEnd = session.endTime;
    const yearDiff = eventYear - oldStart.getUTCFullYear();

    const newStart = new Date(Date.UTC(
      oldStart.getUTCFullYear() + yearDiff,
      oldStart.getUTCMonth(),
      oldStart.getUTCDate(),
      oldStart.getUTCHours(),
      oldStart.getUTCMinutes(),
      oldStart.getUTCSeconds(),
    ));
    const newEnd = new Date(Date.UTC(
      oldEnd.getUTCFullYear() + yearDiff,
      oldEnd.getUTCMonth(),
      oldEnd.getUTCDate(),
      oldEnd.getUTCHours(),
      oldEnd.getUTCMinutes(),
      oldEnd.getUTCSeconds(),
    ));

    const oldDay = oldStart.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
    const newDay = newStart.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

    console.log(`  "${session.title}"`);
    console.log(`    ${oldDay}  →  ${newDay}`);
    console.log(`    ${oldStart.toISOString()}  →  ${newStart.toISOString()}`);

    if (!dryRun) {
      await prisma.scheduleSession.update({
        where: { id: session.id },
        data: { startTime: newStart, endTime: newEnd },
      });
      console.log(`    ✅ Updated`);
    }
    console.log();
  }

  if (dryRun) {
    console.log("─".repeat(80));
    console.log(`\nRun with --apply to fix ${String(wrongYear.length)} session(s)`);
  } else {
    console.log(`\n✅ Fixed ${String(wrongYear.length)} session(s)`);
  }
}

void fixSessionYears()
  .catch((error: unknown) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
