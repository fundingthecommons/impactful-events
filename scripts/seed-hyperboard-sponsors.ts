/**
 * Seed script to add sample sponsors with logos and market cap data
 * for the Hyperboard visualization on the Funding the Commons Residency event
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sponsors = [
  {
    name: "Protocol Labs",
    websiteUrl: "https://protocol.ai",
    logoUrl: "/images/pl-logo.svg",
    marketCap: 35000000, // $35M funding
    qualified: true,
  },
  {
    name: "NEAR",
    websiteUrl: "https://near.org",
    logoUrl: "/images/near.jpeg",
    marketCap: 20000000, // $20M funding
    qualified: true,
  },
  {
    name: "Stellar",
    websiteUrl: "https://stellar.org",
    logoUrl: "/images/stellar-logo.jpeg",
    marketCap: 17000000, // $17M funding
    qualified: true,
  },
  {
    name: "Octant",
    websiteUrl: "https://octant.app",
    logoUrl: "/images/octant-logo.jpg",
    marketCap: 17000000, // $17M funding
    qualified: true,
  },
  {
    name: "Human Tech",
    websiteUrl: "https://human.tech",
    logoUrl: "/images/human-tech.jpg",
    marketCap: 10000000, // $10M funding
    qualified: true,
  },
  {
    name: "Logos",
    websiteUrl: "https://logos.co",
    logoUrl: "/images/logos-logo.png",
    marketCap: 7000000, // $7M funding
    qualified: true,
  },
  {
    name: "Drips",
    websiteUrl: "https://drips.network",
    logoUrl: "/images/drips-logo.svg",
    marketCap: 5000000, // $5M funding
    qualified: true,
  },
];

async function main() {
  console.log("🌱 Starting to seed Hyperboard sponsors...");

  // Find the residency event
  const event = await prisma.event.findUnique({
    where: { id: "funding-commons-residency-2025" },
  });

  if (!event) {
    throw new Error(
      "Event 'funding-commons-residency-2025' not found. Run main seed first.",
    );
  }

  console.log(`✅ Found event: ${event.name}`);

  // Create sponsors and link them to the event
  for (const sponsorData of sponsors) {
    // Create or update sponsor
    const sponsor = await prisma.sponsor.upsert({
      where: { name: sponsorData.name },
      update: {
        websiteUrl: sponsorData.websiteUrl,
        logoUrl: sponsorData.logoUrl,
      },
      create: {
        name: sponsorData.name,
        websiteUrl: sponsorData.websiteUrl,
        logoUrl: sponsorData.logoUrl,
      },
    });

    console.log(`✅ Created/updated sponsor: ${sponsor.name}`);

    // Create or update GeckoCoin with market cap
    const geckoId = sponsorData.name.toLowerCase().replace(/\s+/g, "-");
    await prisma.geckoCoin.upsert({
      where: { geckoId },
      update: {
        marketCap: sponsorData.marketCap,
        sponsorId: sponsor.id,
      },
      create: {
        geckoId,
        sponsorId: sponsor.id,
        symbol: sponsorData.name.substring(0, 3).toUpperCase(),
        name: sponsorData.name,
        marketCap: sponsorData.marketCap,
      },
    });

    console.log(`✅ Created/updated GeckoCoin for: ${sponsor.name}`);

    // Create EventSponsor relationship
    await prisma.eventSponsor.upsert({
      where: {
        eventId_sponsorId: {
          eventId: event.id,
          sponsorId: sponsor.id,
        },
      },
      update: {
        qualified: sponsorData.qualified,
      },
      create: {
        eventId: event.id,
        sponsorId: sponsor.id,
        qualified: sponsorData.qualified,
      },
    });

    console.log(
      `✅ Linked sponsor to event: ${sponsor.name} -> ${event.name} (${sponsorData.qualified ? "Qualified" : "Blueprint"})`,
    );
  }

  console.log("\n🎉 Hyperboard sponsor seeding complete!");
  console.log(
    `\n📊 View the hyperboard at: /events/funding-commons-residency-2025/hyperboard`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
