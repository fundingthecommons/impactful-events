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
    logoUrl:
      "https://site-assets.plasmic.app/feaac31a2e81ebe1a563aae40a7fa1f0.svg",
    marketCap: 5000000000, // $5B
    qualified: true,
  },
  {
    name: "Brave",
    websiteUrl: "https://brave.com",
    logoUrl:
      "https://brave.com/static-assets/images/brave-logo-sans-text.svg",
    marketCap: 1000000000, // $1B
    qualified: true,
  },
  {
    name: "Octant",
    websiteUrl: "https://octant.app",
    logoUrl:
      "https://octant.app/assets/logo-DhwO-Rxr.svg",
    marketCap: 500000000, // $500M
    qualified: true,
  },
  {
    name: "Ethereum Foundation",
    websiteUrl: "https://ethereum.org",
    logoUrl:
      "https://ethereum.org/static/a183661dd70e0e5c70689a0ec95ef0ba/cdbe4/eth-diamond-purple.webp",
    marketCap: 300000000000, // $300B (ETH market cap)
    qualified: true,
  },
  {
    name: "Gitcoin",
    websiteUrl: "https://gitcoin.co",
    logoUrl:
      "https://www.gitcoin.co/logo192.png",
    marketCap: 150000000, // $150M
    qualified: true,
  },
  {
    name: "Optimism",
    websiteUrl: "https://optimism.io",
    logoUrl:
      "https://cryptologos.cc/logos/optimism-ethereum-op-logo.png",
    marketCap: 8000000000, // $8B
    qualified: true,
  },
  {
    name: "Polygon",
    websiteUrl: "https://polygon.technology",
    logoUrl:
      "https://cryptologos.cc/logos/polygon-matic-logo.png",
    marketCap: 7000000000, // $7B
    qualified: true,
  },
  {
    name: "Arbitrum",
    websiteUrl: "https://arbitrum.io",
    logoUrl:
      "https://cryptologos.cc/logos/arbitrum-arb-logo.png",
    marketCap: 12000000000, // $12B
    qualified: true,
  },
  {
    name: "Uniswap",
    websiteUrl: "https://uniswap.org",
    logoUrl:
      "https://cryptologos.cc/logos/uniswap-uni-logo.png",
    marketCap: 6000000000, // $6B
    qualified: true,
  },
  {
    name: "Aave",
    websiteUrl: "https://aave.com",
    logoUrl:
      "https://cryptologos.cc/logos/aave-aave-logo.png",
    marketCap: 4000000000, // $4B
    qualified: true,
  },
  {
    name: "ENS",
    websiteUrl: "https://ens.domains",
    logoUrl:
      "https://cryptologos.cc/logos/ethereum-name-service-ens-logo.png",
    marketCap: 500000000, // $500M
    qualified: true,
  },
  {
    name: "The Graph",
    websiteUrl: "https://thegraph.com",
    logoUrl:
      "https://cryptologos.cc/logos/the-graph-grt-logo.png",
    marketCap: 2000000000, // $2B
    qualified: false, // Blueprint sponsor
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
