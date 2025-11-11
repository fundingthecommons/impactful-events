#!/usr/bin/env tsx

/**
 * Migration script to convert existing UserProject.githubUrl data
 * to the new Repository model structure.
 *
 * This script:
 * 1. Finds all UserProject records with non-empty githubUrl
 * 2. Creates Repository records for each with isPrimary=true
 * 3. Extracts repository name from URL if possible
 * 4. Preserves existing githubUrl for backward compatibility
 * 5. Logs migration results
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Extract repository name from GitHub URL
 * e.g., "https://github.com/username/repo-name" -> "repo-name"
 */
function extractRepoName(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // GitHub URLs typically: /owner/repo
    if (pathParts.length >= 2) {
      return pathParts[1] ?? null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Main migration function
 */
async function migrateRepositories() {
  console.log('🚀 Starting repository migration...\n');

  try {
    // Find all UserProjects with non-empty githubUrl
    const projectsWithGithubUrl = await prisma.userProject.findMany({
      where: {
        githubUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        githubUrl: true,
        repositories: true, // Check if already migrated
      },
    });

    console.log(`📊 Found ${projectsWithGithubUrl.length} projects with GitHub URLs\n`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const project of projectsWithGithubUrl) {
      try {
        // Skip if already has repositories
        if (project.repositories.length > 0) {
          console.log(`⏭️  Skipping "${project.title}" - already has ${project.repositories.length} repositories`);
          skippedCount++;
          continue;
        }

        // Skip if githubUrl is empty string
        if (!project.githubUrl || project.githubUrl.trim() === '') {
          console.log(`⏭️  Skipping "${project.title}" - empty githubUrl`);
          skippedCount++;
          continue;
        }

        const repoName = extractRepoName(project.githubUrl);

        // Create Repository record
        await prisma.repository.create({
          data: {
            projectId: project.id,
            url: project.githubUrl,
            name: repoName ?? 'Main Repository',
            isPrimary: true,
            order: 0,
          },
        });

        console.log(`✅ Migrated "${project.title}" - created repository "${repoName ?? 'Main Repository'}"`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error migrating project "${project.title}":`, error);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${successCount} projects`);
    console.log(`⏭️  Skipped (already migrated or empty): ${skippedCount} projects`);
    console.log(`❌ Errors: ${errorCount} projects`);
    console.log('='.repeat(60));

    if (successCount > 0) {
      console.log('\n✨ Migration completed successfully!');
      console.log('💡 Note: Original githubUrl fields are preserved for backward compatibility.');
    } else if (skippedCount === projectsWithGithubUrl.length) {
      console.log('\n✨ No migration needed - all projects already migrated or have no GitHub URLs.');
    } else {
      console.log('\n⚠️  Migration completed with some errors. Please review the logs above.');
    }
  } catch (error) {
    console.error('\n🔥 Fatal error during migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateRepositories()
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
