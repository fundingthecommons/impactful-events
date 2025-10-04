import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createMissingUsers() {
  console.log('🛠️  Creating missing user records for orphaned applications...\n');

  // Applications that need user records
  const orphanedApplications = [
    {
      id: 'cmgaued7a001duodalae19uuw',
      email: 'likemdzokoto@gmail.com',
      evaluationId: 'cmgcjocmq0013uoyqiatvnzfw'
    },
    {
      id: 'cmgauedf80023uodakiz09lj6', 
      email: 'nakshatragoel05@gmail.com',
      evaluationId: 'cmgcjb06o0001uoyq9iiivhl6'
    }
  ];

  for (const app of orphanedApplications) {
    console.log(`\n=== Processing Application: ${app.id} ===`);
    console.log(`📧 Email: ${app.email}`);

    try {
      // Get application details to extract name from responses
      const application = await prisma.application.findUnique({
        where: { id: app.id },
        include: {
          responses: {
            include: { question: true }
          }
        }
      });

      if (!application) {
        console.log(`❌ Application ${app.id} not found`);
        continue;
      }

      // Extract name from application responses
      const nameResponse = application.responses.find(r => 
        r.question.questionKey === 'full_name' || 
        r.question.questionKey === 'name' ||
        r.question.questionKey.includes('name')
      );

      const extractedName = nameResponse?.answer || 'Unknown User';
      console.log(`👤 Extracted name: ${extractedName}`);

      // Check if user with this email already exists (double-check)
      const existingUser = await prisma.user.findUnique({
        where: { email: app.email }
      });

      if (existingUser) {
        console.log(`✅ User already exists: ${existingUser.name} (${existingUser.id})`);
        
        // Just link the application
        await prisma.application.update({
          where: { id: app.id },
          data: { userId: existingUser.id }
        });
        
        console.log(`🔗 Linked application to existing user`);
        continue;
      }

      // Create new user record
      console.log(`🆕 Creating new user record...`);
      
      const newUser = await prisma.user.create({
        data: {
          email: app.email,
          name: extractedName,
          role: 'user', // default role
          // Note: no password since this was likely a guest application
        }
      });

      console.log(`✅ Created user: ${newUser.name} (${newUser.id})`);

      // Link the application to the new user
      await prisma.application.update({
        where: { id: app.id },
        data: { userId: newUser.id }
      });

      console.log(`🔗 Linked application to new user`);

      // Verify the fix worked
      const updatedApplication = await prisma.application.findUnique({
        where: { id: app.id },
        include: {
          user: {
            select: { id: true, name: true, email: true, adminNotes: true, adminLabels: true }
          }
        }
      });

      if (updatedApplication?.user) {
        console.log(`✅ Verification: Application now has user data`);
        console.log(`   - Name: ${updatedApplication.user.name}`);
        console.log(`   - Email: ${updatedApplication.user.email}`);
        console.log(`   - Admin Notes: ${updatedApplication.user.adminNotes || 'None'}`);
        console.log(`   - Admin Labels: ${updatedApplication.user.adminLabels?.length || 0} labels`);
      } else {
        console.log(`❌ Verification failed: Application still missing user data`);
      }

    } catch (error) {
      console.error(`❌ Error processing application ${app.id}:`, error);
    }
  }

  console.log('\n🏁 User creation complete');
  console.log('\n📝 Next steps:');
  console.log('1. Test the "About this person" button on the affected evaluation pages');
  console.log('2. Add admin notes/labels as needed for the new users');
}

async function main() {
  try {
    await createMissingUsers();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();