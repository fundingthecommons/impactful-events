#!/usr/bin/env tsx

/**
 * Phase 2: Batch Fix Script - Update DRAFT applications to SUBMITTED status
 * 
 * This script safely updates applications identified by Phase 1 analysis:
 * 1. Reads analysis results from Phase 1
 * 2. Double-checks each application before updating
 * 3. Updates status from DRAFT to SUBMITTED with proper timestamps
 * 4. Logs all changes for audit trail
 * 
 * Run with: bunx tsx scripts/fix-draft-applications.ts [--dry-run]
 */

import { PrismaClient } from "@prisma/client";
import { checkApplicationCompleteness } from "~/server/api/utils/applicationCompletion";
import type { AnalysisResult } from "./analyze-draft-applications";

const db = new PrismaClient();

interface BatchUpdateResult {
  applicationId: string;
  userEmail: string;
  userName?: string;
  success: boolean;
  error?: string;
  previousStatus: string;
  newStatus: string;
  submittedAt: Date;
}

async function loadAnalysisResults(): Promise<AnalysisResult[]> {
  const fs = await import('fs');
  const analysisPath = '/tmp/draft-applications-analysis.json';
  
  if (!fs.existsSync(analysisPath)) {
    throw new Error(`Analysis results not found at ${analysisPath}. Run Phase 1 analysis script first.`);
  }
  
  const rawData = fs.readFileSync(analysisPath, 'utf-8');
  return JSON.parse(rawData) as AnalysisResult[];
}

async function validateBeforeUpdate(applicationId: string): Promise<{ valid: boolean; reason?: string }> {
  // Get current application state
  const application = await db.application.findUnique({
    where: { id: applicationId },
    select: { 
      status: true,
      submittedAt: true,
      id: true
    }
  });

  if (!application) {
    return { valid: false, reason: "Application not found" };
  }

  if (application.status !== "DRAFT") {
    return { valid: false, reason: `Current status is ${application.status}, not DRAFT` };
  }

  if (!application.submittedAt) {
    return { valid: false, reason: "No submittedAt timestamp found" };
  }

  // Double-check completion status
  try {
    const completionResult = await checkApplicationCompleteness(db, applicationId);
    if (!completionResult.isComplete) {
      return { 
        valid: false, 
        reason: `Application incomplete: missing ${completionResult.missingFields.join(', ')}` 
      };
    }
  } catch (error) {
    return { valid: false, reason: `Completion check failed: ${error}` };
  }

  return { valid: true };
}

async function updateApplicationStatus(
  applicationId: string, 
  submittedAt: Date,
  dryRun: boolean = false
): Promise<{ success: boolean; error?: string }> {
  if (dryRun) {
    console.log(`  🔄 [DRY RUN] Would update application ${applicationId} to SUBMITTED`);
    return { success: true };
  }

  try {
    await db.application.update({
      where: { id: applicationId },
      data: {
        status: "SUBMITTED",
        submittedAt: submittedAt, // Keep original submission timestamp
        isComplete: true,
        completedAt: submittedAt // Set completion time to submission time
      }
    });

    console.log(`  ✅ Successfully updated application ${applicationId} to SUBMITTED`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`  ❌ Failed to update application ${applicationId}: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

async function batchFixApplications(dryRun: boolean = false): Promise<BatchUpdateResult[]> {
  console.log(`🚀 Starting Phase 2: Batch Fix ${dryRun ? '(DRY RUN)' : '(LIVE UPDATE)'}\n`);

  const analysisResults = await loadAnalysisResults();
  const applicationsToFix = analysisResults.filter(r => r.shouldBeSubmitted);

  if (applicationsToFix.length === 0) {
    console.log("✅ No applications need fixing based on Phase 1 analysis");
    return [];
  }

  console.log(`📋 Found ${applicationsToFix.length} applications to fix from analysis\n`);

  const results: BatchUpdateResult[] = [];

  for (let i = 0; i < applicationsToFix.length; i++) {
    const app = applicationsToFix[i]!;
    console.log(`\n[${i + 1}/${applicationsToFix.length}] Processing ${app.userEmail}...`);

    // Double-check before updating
    console.log(`  🔍 Validating current state...`);
    const validation = await validateBeforeUpdate(app.applicationId);

    if (!validation.valid) {
      console.log(`  ⚠️  Skipping: ${validation.reason}`);
      results.push({
        applicationId: app.applicationId,
        userEmail: app.userEmail,
        userName: app.userName,
        success: false,
        error: validation.reason,
        previousStatus: "DRAFT",
        newStatus: "DRAFT", // No change
        submittedAt: app.submittedAt
      });
      continue;
    }

    console.log(`  ✅ Validation passed`);

    // Perform the update
    const updateResult = await updateApplicationStatus(app.applicationId, app.submittedAt, dryRun);

    results.push({
      applicationId: app.applicationId,
      userEmail: app.userEmail,
      userName: app.userName,
      success: updateResult.success,
      error: updateResult.error,
      previousStatus: "DRAFT",
      newStatus: updateResult.success ? "SUBMITTED" : "DRAFT",
      submittedAt: app.submittedAt
    });
  }

  return results;
}

function generateBatchReport(results: BatchUpdateResult[], dryRun: boolean) {
  console.log("\n" + "=".repeat(60));
  console.log(`📊 PHASE 2 BATCH ${dryRun ? 'DRY RUN' : 'UPDATE'} REPORT`);
  console.log("=".repeat(60));

  const totalProcessed = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`📋 Total applications processed: ${totalProcessed}`);
  console.log(`✅ Successfully ${dryRun ? 'validated' : 'updated'}: ${successful}`);
  console.log(`❌ Failed or skipped: ${failed}`);

  if (successful > 0) {
    console.log(`\n✅ SUCCESSFUL ${dryRun ? 'VALIDATIONS' : 'UPDATES'} (${successful}):`);
    console.log("-".repeat(50));
    
    results
      .filter(r => r.success)
      .forEach((result, index) => {
        console.log(`${index + 1}. ${result.userName ?? 'Unknown'} (${result.userEmail})`);
        console.log(`   ID: ${result.applicationId}`);
        console.log(`   Status: ${result.previousStatus} → ${result.newStatus}`);
        console.log(`   Original Submitted: ${result.submittedAt.toLocaleString()}`);
        console.log("");
      });
  }

  if (failed > 0) {
    console.log(`\n❌ FAILED OR SKIPPED (${failed}):`);
    console.log("-".repeat(50));
    
    results
      .filter(r => !r.success)
      .forEach((result, index) => {
        console.log(`${index + 1}. ${result.userName ?? 'Unknown'} (${result.userEmail})`);
        console.log(`   ID: ${result.applicationId}`);
        console.log(`   Reason: ${result.error}`);
        console.log("");
      });
  }

  console.log("=".repeat(60));

  if (dryRun && successful > 0) {
    console.log(`\n🎯 Dry run complete: ${successful} applications are ready for update`);
    console.log("📋 To perform actual updates, run: bunx tsx scripts/fix-draft-applications.ts");
  } else if (!dryRun && successful > 0) {
    console.log(`\n🎉 Batch update complete: ${successful} applications fixed!`);
    console.log("📧 Note: Users will not receive additional submission emails (they already got them)");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log("🧪 Running in DRY RUN mode - no database changes will be made\n");
  } else {
    console.log("⚠️  LIVE UPDATE mode - database will be modified\n");
  }

  try {
    const results = await batchFixApplications(dryRun);
    generateBatchReport(results, dryRun);
    
    // Save results for audit trail
    const fs = await import('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = `/tmp/batch-fix-results-${timestamp}.json`;
    fs.writeFileSync(outputPath, JSON.stringify({
      dryRun,
      timestamp: new Date().toISOString(),
      results
    }, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);

  } catch (error) {
    console.error("❌ Batch fix failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run main function if this file is executed directly
main().catch(console.error);

export { batchFixApplications, type BatchUpdateResult };