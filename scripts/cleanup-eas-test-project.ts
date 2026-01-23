/**
 * Cleanup script to remove accidentally seeded EAS test project
 *
 * This removes ONLY the duplicate project created by the seed:
 * - UserProject: relay-funder-eas-test
 * - Repository: relay-funder-repo-eas-test (cascaded)
 * - RepositoryResidencyMetrics (cascaded)
 *
 * It does NOT touch the real user (Sara Johnstone) or her profile.
 *
 * Usage:
 *   bun run scripts/cleanup-eas-test-project.ts --dry-run
 *   bun run scripts/cleanup-eas-test-project.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

const TEST_PROJECT_ID = "relay-funder-eas-test";
const TEST_REPO_ID = "relay-funder-repo-eas-test";

async function main() {
  console.log("EAS Test Project Cleanup Script");
  console.log("============================================================");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes will be made)" : "LIVE"}`);
  console.log("");

  // Find the test project with all related records
  const testProject = await prisma.userProject.findUnique({
    where: { id: TEST_PROJECT_ID },
    include: {
      profile: {
        include: {
          user: true,
        },
      },
      repositories: {
        include: {
          residencyMetrics: true,
          attestations: true,
        },
      },
    },
  });

  if (!testProject) {
    console.log(`❌ Test project not found: ${TEST_PROJECT_ID}`);
    console.log("   Nothing to clean up.");
    return;
  }

  // Display what will be deleted
  console.log("Records to be deleted:");
  console.log("──────────────────────────────────────────────────────");
  console.log(`UserProject: ${testProject.title}`);
  console.log(`  ID: ${testProject.id}`);
  console.log(
    `  Owner: ${testProject.profile.user.email} (${testProject.profile.user.name})`
  );
  console.log("");

  for (const repo of testProject.repositories) {
    console.log(`  └─ Repository: ${repo.name} (${repo.id})`);
    console.log(`      URL: ${repo.url}`);
    console.log(
      `      └─ ResidencyMetrics: ${repo.residencyMetrics.length} records`
    );
    console.log(`      └─ Attestations: ${repo.attestations.length} records`);
  }

  console.log("");
  console.log("Records that will be KEPT (not deleted):");
  console.log("──────────────────────────────────────────────────────");
  console.log(`  User: ${testProject.profile.user.email}`);
  console.log(`  UserProfile: ${testProject.profile.id}`);

  // Verify this is the test data (safety check)
  const testRepo = testProject.repositories.find((r) => r.id === TEST_REPO_ID);

  if (!testRepo) {
    console.log("");
    console.log("⚠️  Warning: Expected test repository ID not found in project.");
    console.log(`   Expected repo ID: ${TEST_REPO_ID}`);
    console.log("   This may not be the test data. Aborting.");
    return;
  }

  if (DRY_RUN) {
    console.log("");
    console.log("──────────────────────────────────────────────────────");
    console.log(
      "[DRY RUN] Would delete the project and cascaded records above."
    );
    console.log("The user and profile will NOT be deleted.");
    console.log("");
    console.log("Run without --dry-run to execute deletion.");
    return;
  }

  // Execute deletion (cascades handle Repository and ResidencyMetrics)
  console.log("");
  console.log(
    "Deleting test project (cascades will remove repositories and metrics)..."
  );

  await prisma.userProject.delete({
    where: { id: TEST_PROJECT_ID },
  });

  console.log("");
  console.log("✅ Successfully deleted test project and cascaded records.");
  console.log("   User and profile remain intact.");
}

void main()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
