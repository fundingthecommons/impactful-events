import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Starting to cleanup mentor questions...')

  // Get the residency event
  const event = await prisma.event.findUnique({
    where: { id: 'funding-commons-residency-2025' }
  })

  if (!event) {
    console.error('❌ Event funding-commons-residency-2025 not found.')
    return
  }

  // Find all mentor questions (those with questionKey starting with "mentor_")
  const mentorQuestions = await prisma.applicationQuestion.findMany({
    where: {
      eventId: event.id,
      questionKey: {
        startsWith: 'mentor_'
      }
    }
  })

  console.log(`📊 Found ${mentorQuestions.length} mentor questions to delete`)

  if (mentorQuestions.length === 0) {
    console.log('✅ No mentor questions found. Database is already clean.')
    return
  }

  // List the questions that will be deleted
  console.log('📝 Questions to be deleted:')
  mentorQuestions.forEach((q, index) => {
    console.log(`  ${index + 1}. ${q.questionKey} (order: ${q.order})`)
  })

  // Delete all mentor questions
  const deleteResult = await prisma.applicationQuestion.deleteMany({
    where: {
      eventId: event.id,
      questionKey: {
        startsWith: 'mentor_'
      }
    }
  })

  console.log(`✅ Successfully deleted ${deleteResult.count} mentor questions`)
  
  // Verify cleanup
  const remainingMentorQuestions = await prisma.applicationQuestion.findMany({
    where: {
      eventId: event.id,
      questionKey: {
        startsWith: 'mentor_'
      }
    }
  })

  if (remainingMentorQuestions.length === 0) {
    console.log('🎉 Cleanup completed successfully! No mentor questions remain.')
  } else {
    console.error(`❌ Cleanup incomplete. ${remainingMentorQuestions.length} mentor questions still exist.`)
  }

  // Show remaining question count
  const totalQuestions = await prisma.applicationQuestion.count({
    where: { eventId: event.id }
  })
  console.log(`📊 Total questions remaining for event: ${totalQuestions}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error cleaning up mentor questions:', e)
    await prisma.$disconnect()
    process.exit(1)
  })