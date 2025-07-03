import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const initialSponsors = [
  { name: "Aave", websiteUrl: "https://aave.com", logoUrl: null },
  { name: "ENS", websiteUrl: "https://ens.domains", logoUrl: null },
  { name: "Logos", websiteUrl: "https://logos.co", logoUrl: null },
  { name: "Octant", websiteUrl: "https://octant.app", logoUrl: null },
  { name: "Gitcoin", websiteUrl: "https://gitcoin.co", logoUrl: null },
  { name: "Hats", websiteUrl: "https://hats.finance", logoUrl: null },
  { name: "Stellar", websiteUrl: "https://stellar.org", logoUrl: null },
  { name: "Masa", websiteUrl: "https://masa.finance", logoUrl: null },
]

async function main() {
  console.log('🌱 Starting to seed database...')

  // Create a default user for event creation
  const defaultUser = await prisma.user.upsert({
    where: { email: 'admin@realfi.com' },
    update: {},
    create: {
      email: 'admin@realfi.com',
      name: 'RealFi Admin',
    },
  })
  console.log(`✅ Created/updated user: ${defaultUser.name}`)

  // Create sponsors
  for (const sponsorData of initialSponsors) {
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
    })
    console.log(`✅ Created/updated sponsor: ${sponsor.name}`)
  }

  // Create RealFi event
  const realFiEvent = await prisma.event.upsert({
    where: { id: 'realfi-hackathon-2024' },
    update: {
      name: 'RealFi Hackathon',
      description: 'A hackathon focused on real-world financial applications using blockchain technology',
      type: 'HACKATHON',
      isOnline: false,
      location: 'San Francisco, CA',
    },
    create: {
      id: 'realfi-hackathon-2024',
      name: 'RealFi Hackathon',
      description: 'A hackathon focused on real-world financial applications using blockchain technology',
      startDate: new Date('2024-09-15T09:00:00Z'),
      endDate: new Date('2024-09-17T18:00:00Z'),
      type: 'HACKATHON',
      isOnline: false,
      location: 'San Francisco, CA',
      createdById: defaultUser.id,
    },
  })
  console.log(`✅ Created/updated event: ${realFiEvent.name}`)

  // Create EventSponsor relationships for Aave, ENS, and Logos
  const targetSponsors = ['Aave', 'ENS', 'Logos']
  
  for (const sponsorName of targetSponsors) {
    const sponsor = await prisma.sponsor.findUnique({
      where: { name: sponsorName }
    })
    
    if (sponsor) {
      const eventSponsor = await prisma.eventSponsor.upsert({
        where: {
          eventId_sponsorId: {
            eventId: realFiEvent.id,
            sponsorId: sponsor.id,
          }
        },
        update: {},
        create: {
          eventId: realFiEvent.id,
          sponsorId: sponsor.id,
        },
      })
      console.log(`✅ Created/updated EventSponsor relationship: ${sponsorName} -> ${realFiEvent.name}`)
    } else {
      console.log(`⚠️  Sponsor ${sponsorName} not found, skipping EventSponsor creation`)
    }
  }

  console.log('🎉 Seeding completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e)
    await prisma.$disconnect()
    process.exit(1)
  }) 