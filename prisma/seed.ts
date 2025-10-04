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
      role: 'admin',
    },
  })
  console.log(`✅ Created/updated user: ${defaultUser.name}`)

  // Create Elinor Ostrom AI reviewer
  const elinorOstrom = await prisma.user.upsert({
    where: { email: 'ostrom@fundingthecommons.io' },
    update: {},
    create: {
      email: 'ostrom@fundingthecommons.io',
      name: 'Elinor Ostrom',
      role: 'admin',
      isAIReviewer: true,
    },
  })
  console.log(`✅ Created/updated AI reviewer: ${elinorOstrom.name}`)

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

  // Create default roles for invitation system
  const defaultRoles = [
    { name: 'sponsor', description: 'Event sponsor with access to sponsor areas' },
    { name: 'mentor', description: 'Event mentor providing guidance to participants' },
    { name: 'judge', description: 'Event judge for evaluating submissions' },
    { name: 'organizer', description: 'Event organizer with management permissions' },
    { name: 'speaker', description: 'Event speaker or presenter' },
    { name: 'volunteer', description: 'Event volunteer helping with operations' },
    { name: 'participant', description: 'General event participant' }
  ]

  console.log('🌱 Creating default roles...')
  for (const roleData of defaultRoles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: {
        name: roleData.name,
      },
    })
    console.log(`✅ Created/updated role: ${role.name}`)
  }

  // Create RealFi event
  const realFiEvent = await prisma.event.upsert({
    where: { id: 'realfi-hackathon-2025' },
    update: {
      name: 'RealFi Hackathon',
      description: 'A hackathon focused on real-world financial applications using blockchain technology',
      type: 'HACKATHON',
      isOnline: false,
      location: 'San Francisco, CA',
    },
    create: {
      id: 'realfi-hackathon-2025',
      name: 'RealFi Hackathon',
      description: 'A hackathon focused on real-world financial applications using blockchain technology',
      startDate: new Date('2025-09-15T09:00:00Z'),
      endDate: new Date('2025-09-17T18:00:00Z'),
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

  // Create Residency event
  const residencyEvent = await prisma.event.upsert({
    where: { id: 'funding-commons-residency-2025' },
    update: {
      name: 'Funding the Commons Residency',
      description: 'Intensive residency program for selected participants to work on projects and build connections in the public goods and climate funding ecosystem.',
      type: 'residency',
      isOnline: false,
      location: 'Buenos Aires, Argentina',
    },
    create: {
      id: 'funding-commons-residency-2025',
      name: 'Funding the Commons Residency',
      description: 'Intensive residency program for selected participants to work on projects and build connections in the public goods and climate funding ecosystem.',
      startDate: new Date('2025-10-24T09:00:00Z'),
      endDate: new Date('2025-11-14T18:00:00Z'),
      type: 'residency',
      isOnline: false,
      location: 'Buenos Aires, Argentina',
      createdById: defaultUser.id,
    },
  })
  console.log(`✅ Created/updated event: ${residencyEvent.name}`)

  // Create application questions for residency
  const residencyQuestions = [
    {
      questionKey: "full_name",
      questionEn: "First and last legal name as listed on your passport",
      questionEs: "Nombre y apellido como aparece en tu pasaporte",
      questionType: "TEXT" as const,
      required: true,
      order: 1
    },
    {
      questionKey: "email",
      questionEn: "Email",
      questionEs: "Correo electrónico",
      questionType: "EMAIL" as const,
      required: true,
      order: 2
    },
    {
      questionKey: "nationality",
      questionEn: "What is your nationality?",
      questionEs: "¿Cuál es tu nacionalidad?",
      questionType: "TEXT" as const,
      required: true,
      order: 3
    },
    {
      questionKey: "twitter",
      questionEn: "Twitter",
      questionEs: "Twitter",
      questionType: "URL" as const,
      required: false,
      order: 4
    },
    {
      questionKey: "github",
      questionEn: "GitHub",
      questionEs: "GitHub",
      questionType: "URL" as const,
      required: false,
      order: 5
    },
    {
      questionKey: "linkedin",
      questionEn: "LinkedIn",
      questionEs: "LinkedIn",
      questionType: "URL" as const,
      required: false,
      order: 6
    },
    {
      questionKey: "telegram",
      questionEn: "Telegram",
      questionEs: "Telegram",
      questionType: "TEXT" as const,
      required: true,
      order: 7
    },
    {
      questionKey: "program_availability",
      questionEn: "Will you be able to attend the full program from October 24th through November 14th?",
      questionEs: "¿Estarás disponible durante todo el tiempo que duré la residencia?",
      questionType: "SELECT" as const,
      required: true,
      options: ["Yes, I can attend the full program", "I might miss a week or two", "I'm not sure yet"],
      order: 8
    },
    {
      questionKey: "project_description",
      questionEn: "What do you want to build during the residency?",
      questionEs: "¿Qué proyecto quieres desarrollar durante la residencia?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 9
    },
    {
      questionKey: "prior_experience",
      questionEn: "What is your prior experience with cryptography/currency, decentralized technologies, and/or climate, and public goods funding systems?",
      questionEs: "Cuéntanos más sobre tu experiencia en criptografía, criptomonedas, tecnologías descentralizadas y/o sistemas de financiación de bienes públicos.",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 10
    },
    {
      questionKey: "financial_support",
      questionEn: "Do you need financial support to attend the residency?",
      questionEs: "¿Necesitas apoyo financiero para atender la residencia?",
      questionType: "SELECT" as const,
      required: true,
      options: ["Yes", "No", "Partial support"],
      order: 11
    },
    {
      questionKey: "visa_needed",
      questionEn: "Do you need a visa?",
      questionEs: "¿Necesitas visa?",
      questionType: "SELECT" as const,
      required: true,
      options: ["Yes", "No"],
      order: 12
    },
    {
      questionKey: "terms_agreement",
      questionEn: "Do you agree to our terms and conditions?",
      questionEs: "¿Aceptas nuestros términos y condiciones?",
      questionType: "SELECT" as const,
      required: true,
      options: ["Yes", "No"],
      order: 13
    },
    {
      questionKey: "commitments",
      questionEn: "What, if any, commitments (e.g. work/spouse/family) do you have that would make committing to the residency difficult?",
      questionEs: "¿Qué compromisos, si es que tienes alguno (trabajo, pareja, familia), podrían dificultarte comprometerte a atender la residencia?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 14
    },
    {
      questionKey: "how_heard",
      questionEn: "How did you hear about this program? If you were referred by someone, please tell us who.",
      questionEs: "¿Cómo te enteraste del programa? Si alguien te lo recomendó, por favor dinos quién fue.",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 15
    },
    {
      questionKey: "fully_available",
      questionEn: "Are you fully available for the duration of the residency?",
      questionEs: "¿Estás completamente disponible durante toda la duración de la residencia?",
      questionType: "SELECT" as const,
      required: true,
      options: ["Yes", "No", "Mostly"],
      order: 16
    },
    {
      questionKey: "technical_skills",
      questionEn: "What are your technical skills? Please select all that apply.",
      questionEs: "¿Cuáles son tus habilidades técnicas? Por favor, selecciona todas las que apliquen.",
      questionType: "MULTISELECT" as const,
      required: true,
      options: ["Designer", "Developer", "Project Manager", "Researcher", "Other"],
      order: 17
    },
    {
      questionKey: "technical_skills_other",
      questionEn: "If you answered 'other' in the previous question, please specify here. If you did not select 'other,' please answer with N/A.",
      questionEs: "Si respondiste \"otro\" en la pregunta anterior, por favor da más detalle. Si no seleccionaste \"otro\", responde con N/A.",
      questionType: "TEXT" as const,
      required: true,
      order: 18
    },
    {
      questionKey: "skill_rating",
      questionEn: "On a scale of 1-10, 1 being a beginner, 5 being very confident about the skill, and 10 being world-class expert, how would you rate the technical skills you chose for the last two questions?",
      questionEs: "En una escala del 1 al 10, donde 1 es principiante, 5 es tener buen manejo y 10 es ser experto, ¿cómo calificarías las habilidades técnicas que marcaste en las dos preguntas anteriores?",
      questionType: "NUMBER" as const,
      required: true,
      order: 19
    },
    {
      questionKey: "open_source_experience",
      questionEn: "Tell us about a time when you contributed to a collaborative or open-source effort. What did you learn?",
      questionEs: "Dime de alguna vez en la que tuviste que contribuir a una iniciativa de open-source. ¿Qué aprendiste?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 20
    },
    {
      questionKey: "funding_commons_meaning",
      questionEn: "What does 'funding the commons' mean to you, and why is it important?",
      questionEs: "¿Qué significa para ti \"funding the commons\" y por qué es importante?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 21
    },
    {
      questionKey: "public_goods_motivation",
      questionEn: "What motivates you to contribute to the public goods ecosystem?",
      questionEs: "¿Qué te motiva a construir y contribuir en el ecosistema de Public Goods (Bienes Públicos)?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 22
    },
    {
      questionKey: "realfi_interest",
      questionEn: "Are you currently working on—or interested in building—real-fi solutions (solutions for the real world)? Please elaborate.",
      questionEs: "¿Actualmente estás trabajando o te interesaría trabajar en soluciones RealFi (para el mundo real)? Por favor describe.",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 23
    },
    {
      questionKey: "privacy_tools",
      questionEn: "Do privacy-preserving tools or protocols play a role in your work? If so, how?",
      questionEs: "¿Las herramientas o protocolos que preservan la privacidad juegan un rol en tu trabajo? Si es así, ¿cómo?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 24
    },
    {
      questionKey: "funding_mechanisms",
      questionEn: "Have you experimented with or proposed new public goods funding mechanisms (e.g. quadratic funding, retroPGF, hypercerts)? Tell us more.",
      questionEs: "¿Has experimentado con o propuesto nuevos mecanismos de financiamiento para Public Goods (por ejemplo, quadratic funding, retroPGF, hypercerts)? Cuéntanos más.",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 25
    },
    {
      questionKey: "impact_measurement",
      questionEn: "How do you think we should measure the impact of public goods?",
      questionEs: "En tu opinión, ¿cómo debería medirse el impacto de los Public Goods (Bienes Públicos)?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 26
    },
    {
      questionKey: "connections_sought",
      questionEn: "What kind of people or expertise are you hoping to connect with during the residency?",
      questionEs: "¿Con qué tipo de personas o conocimientos te gustaría conectar durante la residencia?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 27
    },
    {
      questionKey: "cohort_contribution",
      questionEn: "What can you offer to others in the cohort?",
      questionEs: "¿Qué puedes ofrecer a tus demás compañeros en esta edición de la residencia?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 28
    },
    {
      questionKey: "intro_video_link",
      questionEn: "Please include a one-minute introduction video. You can upload it here, or share a private YouTube or Loom link below.",
      questionEs: "Por favor, incluye un video de presentación de un minuto. Puedes subirlo aquí o compartir un enlace privado de YouTube or Loom abajo.",
      questionType: "URL" as const,
      required: true,
      order: 29
    },
    {
      questionKey: "additional_info",
      questionEn: "Is there anything else you want us to know about you?",
      questionEs: "¿Hay algo más que quieras contarnos sobre ti?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 30
    },
    {
      questionKey: "newsletter_subscription",
      questionEn: "Do you want to subscribe to our newsletter?",
      questionEs: "¿Te quieres suscribir a nuestro newsletter?",
      questionType: "SELECT" as const,
      required: true,
      options: ["Yes", "No"],
      order: 31
    }
  ]

  console.log('🌱 Creating application questions for residency...')
  for (const questionData of residencyQuestions) {
    await prisma.applicationQuestion.upsert({
      where: {
        eventId_questionKey: {
          eventId: residencyEvent.id,
          questionKey: questionData.questionKey,
        },
      },
      update: questionData,
      create: {
        ...questionData,
        eventId: residencyEvent.id,
      },
    })
    console.log(`✅ Created/updated question: ${questionData.questionKey}`)
  }

  // Create evaluation criteria for residency vetting
  const evaluationCriteria = [
    // Technical Category (20% weight - reduced from 30%)
    {
      name: "Technical Skills Assessment",
      description: "Evaluate technical capabilities based on self-reported skills, experience level (1-10), and GitHub/portfolio evidence. Consider depth vs breadth of skills.",
      category: "TECHNICAL" as const,
      weight: 0.08, // 8% of total (reduced from 12%)
      order: 1
    },
    {
      name: "Open Source & Collaborative Experience",
      description: "Assess quality of open source contributions, collaborative work experience, and ability to work in distributed teams based on their story and evidence.",
      category: "TECHNICAL" as const,
      weight: 0.07, // 7% of total (reduced from 10%)
      order: 2
    },
    {
      name: "Learning & Adaptation Ability", 
      description: "Evaluate growth mindset, ability to learn new technologies, and adaptability based on their experience descriptions and skill progression.",
      category: "TECHNICAL" as const,
      weight: 0.05, // 5% of total (reduced from 8%)
      order: 3
    },

    // Project Category (20% weight - reduced from 25%)
    {
      name: "Project Vision & Feasibility",
      description: "Assess the clarity, innovation, and feasibility of their proposed residency project. Consider if it's appropriately scoped for the timeframe.",
      category: "PROJECT" as const,
      weight: 0.08, // 8% of total (reduced from 10%)
      order: 4
    },
    {
      name: "Public Goods & RealFi Alignment",
      description: "Evaluate how well their project aligns with public goods funding, RealFi solutions, and the residency's mission. Look for genuine understanding vs surface-level answers.",
      category: "PROJECT" as const,
      weight: 0.07, // 7% of total (reduced from 8%)  
      order: 5
    },
    {
      name: "Impact Potential & Measurement Understanding",
      description: "Assess their understanding of impact measurement, realistic expectations for project outcomes, and potential for meaningful contribution to the ecosystem.",
      category: "PROJECT" as const,
      weight: 0.05, // 5% of total (reduced from 7%)
      order: 6
    },

    // Community Fit Category (20% weight - reduced from 25%)
    {
      name: "Public Goods Ecosystem Understanding",
      description: "Evaluate depth of understanding of public goods funding mechanisms, familiarity with the ecosystem, and genuine motivation vs opportunistic interest.",
      category: "COMMUNITY_FIT" as const,
      weight: 0.07, // 7% of total (reduced from 8%)
      order: 7
    },
    {
      name: "Community Contribution Potential",
      description: "Assess what unique value they can bring to the cohort, mentorship abilities, collaborative mindset, and cultural fit with FtC community values.",
      category: "COMMUNITY_FIT" as const,
      weight: 0.08, // 8% of total (reduced from 9%)
      order: 8
    },
    {
      name: "Commitment & Availability",
      description: "Evaluate their commitment level, availability for full program duration, ability to manage competing priorities, and likelihood of completion.",
      category: "COMMUNITY_FIT" as const,
      weight: 0.05, // 5% of total (reduced from 8%)
      order: 9
    },

    // Video Category (15% weight - reduced from 20%)
    {
      name: "Communication Skills",
      description: "Assess clarity of expression, ability to articulate complex ideas, English proficiency, and overall communication effectiveness from the 1-minute video.",
      category: "VIDEO" as const,
      weight: 0.06, // 6% of total (reduced from 8%)
      order: 10
    },
    {
      name: "Passion & Authenticity",
      description: "Evaluate genuine enthusiasm for the mission, authentic interest vs scripted responses, energy level, and personal connection to the work.",
      category: "VIDEO" as const,
      weight: 0.05, // 5% of total (reduced from 7%)
      order: 11
    },
    {
      name: "Professionalism & Presentation",
      description: "Assess video quality, preparation level, time management (staying within 1 minute), and overall professionalism of presentation.",
      category: "VIDEO" as const,
      weight: 0.04, // 4% of total (reduced from 5%)
      order: 12
    },

    // Entrepreneurial Category (25% weight - new category)
    {
      name: "Leadership & Team Building",
      description: "Evaluate track record of leading teams, inspiring others, building collaborative relationships, and ability to guide projects to completion. Look for concrete examples of leadership roles and team management experience.",
      category: "ENTREPRENEURIAL" as const,
      weight: 0.08, // 8% of total
      order: 13
    },
    {
      name: "Business Acumen & Market Understanding", 
      description: "Assess understanding of market dynamics, business models, go-to-market strategies, and commercial viability. Consider their grasp of the competitive landscape and value proposition articulation.",
      category: "ENTREPRENEURIAL" as const,
      weight: 0.07, // 7% of total
      order: 14
    },
    {
      name: "Execution Track Record",
      description: "Analyze history of completing projects, delivering on commitments, overcoming obstacles, and turning ideas into reality. Look for evidence of consistent follow-through and results achievement.",
      category: "ENTREPRENEURIAL" as const,
      weight: 0.09, // 9% of total
      order: 15
    },
    {
      name: "Network & Relationship Building",
      description: "Evaluate ability to build meaningful professional relationships, ecosystem connections, and strategic partnerships. Consider quality of references and professional network depth.",
      category: "ENTREPRENEURIAL" as const,
      weight: 0.06, // 6% of total
      order: 16
    },
    {
      name: "Risk Assessment & Calculated Risk-Taking",
      description: "Assess balanced approach to risk, evidence of intelligent risk-taking, and ability to make decisions under uncertainty. Look for examples of calculated risks that led to growth or learning.",
      category: "ENTREPRENEURIAL" as const,
      weight: 0.07, // 7% of total
      order: 17
    },
    {
      name: "Resilience & Adaptability",
      description: "Evaluate evidence of bouncing back from setbacks, pivoting when needed, learning from failures, and maintaining persistence through challenges. Consider growth mindset and adaptability to changing circumstances.",
      category: "ENTREPRENEURIAL" as const,
      weight: 0.08, // 8% of total
      order: 18
    }
  ]

  console.log('🌱 Creating evaluation criteria for residency vetting...')
  for (const criteriaData of evaluationCriteria) {
    const criteria = await prisma.evaluationCriteria.upsert({
      where: { 
        name: criteriaData.name
      },
      update: criteriaData,
      create: criteriaData,
    })
    console.log(`✅ Created/updated evaluation criteria: ${criteria.name} (${(criteria.weight * 100).toFixed(1)}%)`)
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