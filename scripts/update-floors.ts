/**
 * One-time script: Replace generic Floor 1-12 venues with real floor names
 * for the Intelligence at the Frontier event.
 *
 * Usage:
 *   bunx tsx scripts/update-floors.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EVENT_SLUG = "intelligence-at-the-frontier";

const NEW_FLOORS = [
  { name: "Floor 14 (Flourishing)", order: 1 },
  { name: "Floor 12 (Ethereum & Decentralized Tech)", order: 2 },
  { name: "Floor 9 (AI & Autonomous Systems)", order: 3 },
  { name: "Floor 8 (Neuro & Biotech)", order: 4 },
  { name: "Floor 7 (Maker Space)", order: 5 },
  { name: "Floor 6 (Arts & Music)", order: 6 },
  { name: "Floor 4 (Robotics & Hard Tech)", order: 7 },
  { name: "Floor 2 (Funding the Commons)", order: 8 },
  { name: "Common Spaces, Lounges, Other", order: 9 },
];

async function main() {
  console.log("🏢 Updating floors for Intelligence at the Frontier...\n");

  const event = await prisma.event.findFirst({
    where: { slug: EVENT_SLUG },
  });

  if (!event) {
    console.error(`❌ Event with slug "${EVENT_SLUG}" not found.`);
    process.exit(1);
  }

  console.log(`📅 Target event: ${event.name} (${event.id})\n`);

  // Delete all existing venues for this event
  const deleted = await prisma.scheduleVenue.deleteMany({
    where: { eventId: event.id },
  });
  console.log(`🗑️  Deleted ${deleted.count} existing venues\n`);

  // Create new floors
  console.log("🏢 Creating new floors...");
  for (const floor of NEW_FLOORS) {
    await prisma.scheduleVenue.create({
      data: {
        eventId: event.id,
        name: floor.name,
        order: floor.order,
      },
    });
    console.log(`  ✅ ${floor.name}`);
  }

  console.log(`\n🎉 Done! Created ${NEW_FLOORS.length} floors.`);
}

void main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
