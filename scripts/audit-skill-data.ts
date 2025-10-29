#!/usr/bin/env tsx

/**
 * Skills Data Audit Script
 *
 * Generates a comprehensive report on the current state of skills data
 * across multiple storage systems (UserProfile, UserSkills, ApplicationResponse).
 *
 * This script identifies:
 * - Data loss gaps (unsynced skill ratings, prior experience)
 * - Data quality issues (duplicates, variations, missing categories)
 * - Migration opportunities
 * - System usage statistics
 *
 * Usage:
 *   bun run scripts/audit-skill-data.ts
 *   bun run scripts/audit-skill-data.ts --format json > audit.json
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuditResults {
  summary: {
    totalUsers: number;
    usersWithProfiles: number;
    usersWithLegacySkills: number;
    usersWithNormalizedSkills: number;
    totalApplications: number;
    acceptedApplications: number;
  };
  dataLoss: {
    skillRatingsLost: number;
    skillRatingsSynced: number;
    priorExperienceLost: number;
    priorExperienceSynced: number;
    applicantsWithoutProfiles: number;
    applicantsWithoutSkills: number;
  };
  skillCatalog: {
    totalSkills: number;
    skillsWithCategories: number;
    skillsWithoutCategories: number;
    averagePopularity: number;
    topSkills: Array<{ name: string; popularity: number; category: string | null }>;
  };
  dataQuality: {
    duplicateVariations: Array<{ variations: string[]; count: number }>;
    orphanedUserSkills: number;
    profilesNeedingMigration: number;
  };
  eventBreakdown: Array<{
    eventName: string;
    applications: number;
    accepted: number;
    withSkills: number;
    withRatings: number;
    withExperience: number;
  }>;
}

// Normalize skill name for comparison
function normalizeSkillName(skill: string): string {
  return skill
    .toLowerCase()
    .trim()
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ');
}

// Group similar skills
function findSkillVariations(skills: string[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  skills.forEach(skill => {
    const normalized = normalizeSkillName(skill);
    if (!grouped.has(normalized)) {
      grouped.set(normalized, []);
    }
    grouped.get(normalized)!.push(skill);
  });

  return grouped;
}

async function runAudit(): Promise<AuditResults> {
  console.log('🔍 Starting Skills Data Audit...\n');

  // ============================================
  // SECTION 1: User & Profile Statistics
  // ============================================
  console.log('📊 Collecting user statistics...');

  const totalUsers = await prisma.user.count();
  const usersWithProfiles = await prisma.userProfile.count();

  const usersWithLegacySkills = await prisma.userProfile.count({
    where: {
      skills: {
        isEmpty: false
      }
    }
  });

  const usersWithNormalizedSkills = await prisma.userSkills.groupBy({
    by: ['userId'],
  }).then(result => result.length);

  const totalApplications = await prisma.application.count();
  const acceptedApplications = await prisma.application.count({
    where: { status: 'ACCEPTED' }
  });

  // ============================================
  // SECTION 2: Data Loss Analysis
  // ============================================
  console.log('🔍 Analyzing data loss gaps...');

  // Find applications with skill_rating answers
  const skillRatingResponses = await prisma.applicationResponse.findMany({
    where: {
      question: {
        questionKey: 'skill_rating'
      }
    },
    include: {
      application: {
        select: {
          userId: true,
          status: true,
          event: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  // Find how many of those users have UserSkills with experienceLevel set
  const usersWithRatings = new Set(skillRatingResponses.map(r => r.application.userId));
  const userSkillsWithExperience = await prisma.userSkills.findMany({
    where: {
      userId: { in: Array.from(usersWithRatings) },
      experienceLevel: { not: null }
    },
    select: { userId: true }
  });
  const usersWithSyncedRatings = new Set(userSkillsWithExperience.map(us => us.userId));

  const skillRatingsLost = usersWithRatings.size - usersWithSyncedRatings.size;
  const skillRatingsSynced = usersWithSyncedRatings.size;

  // Find applications with prior_experience answers
  const priorExperienceResponses = await prisma.applicationResponse.findMany({
    where: {
      question: {
        questionKey: 'prior_experience'
      },
      answer: {
        not: ''
      }
    },
    include: {
      application: {
        select: {
          userId: true,
          status: true
        }
      }
    }
  });

  // Find how many have it synced to profile
  const usersWithPriorExp = new Set(priorExperienceResponses.map(r => r.application.userId));
  const profilesWithPriorExp = await prisma.userProfile.findMany({
    where: {
      userId: { in: Array.from(usersWithPriorExp) },
      bio: { not: null }
    },
    select: { userId: true }
  });

  // Note: This is a rough estimate since prior_experience might be in bio
  const priorExperienceSynced = profilesWithPriorExp.length;
  const priorExperienceLost = usersWithPriorExp.size - priorExperienceSynced;

  // Accepted applicants without profiles
  const acceptedApplicants = await prisma.application.findMany({
    where: { status: 'ACCEPTED' },
    select: { userId: true }
  });
  const acceptedUserIds = new Set(acceptedApplicants.map(a => a.userId));
  const profileUserIds = await prisma.userProfile.findMany({
    where: { userId: { in: Array.from(acceptedUserIds) } },
    select: { userId: true }
  }).then(profiles => new Set(profiles.map(p => p.userId)));

  const applicantsWithoutProfiles = acceptedUserIds.size - profileUserIds.size;

  // Accepted applicants with profiles but no skills
  const profilesWithSkills = await prisma.userProfile.findMany({
    where: {
      userId: { in: Array.from(acceptedUserIds) },
      OR: [
        { skills: { isEmpty: false } },
      ]
    },
    select: { userId: true }
  });

  const applicantsWithoutSkills = acceptedUserIds.size - profilesWithSkills.length;

  // ============================================
  // SECTION 3: Skill Catalog Analysis
  // ============================================
  console.log('📚 Analyzing skill catalog...');

  const totalSkills = await prisma.skills.count();
  const skillsWithCategories = await prisma.skills.count({
    where: { category: { not: null } }
  });
  const skillsWithoutCategories = totalSkills - skillsWithCategories;

  const allSkills = await prisma.skills.findMany({
    select: {
      name: true,
      popularity: true,
      category: true
    }
  });

  const averagePopularity = allSkills.length > 0
    ? allSkills.reduce((sum, s) => sum + s.popularity, 0) / allSkills.length
    : 0;

  const topSkills = allSkills
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 10)
    .map(s => ({
      name: s.name,
      popularity: s.popularity,
      category: s.category
    }));

  // ============================================
  // SECTION 4: Data Quality Issues
  // ============================================
  console.log('🔍 Checking data quality...');

  // Find skill duplicates/variations in UserProfile.skills
  const allProfileSkills = await prisma.userProfile.findMany({
    where: {
      skills: { isEmpty: false }
    },
    select: { skills: true }
  });

  const uniqueSkillStrings = new Set<string>();
  allProfileSkills.forEach(profile => {
    profile.skills.forEach((skill: string) => uniqueSkillStrings.add(skill));
  });

  const skillVariations = findSkillVariations(Array.from(uniqueSkillStrings));
  const duplicateVariations = Array.from(skillVariations.entries())
    .filter(([_, variations]) => variations.length > 1)
    .map(([normalized, variations]) => ({
      variations: variations.sort(),
      count: variations.length
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20 problematic duplicates

  // Find orphaned UserSkills (user or skill deleted)
  const orphanedUserSkills = await prisma.userSkills.count({
    where: {
      OR: [
        { user: null },
        { skill: null }
      ]
    }
  });

  // Profiles that need migration (have legacy skills but no UserSkills)
  const profilesWithLegacySkills = await prisma.userProfile.findMany({
    where: {
      skills: { isEmpty: false }
    },
    select: { userId: true }
  });

  const profilesWithUserSkills = await prisma.userSkills.groupBy({
    by: ['userId'],
    where: {
      userId: { in: profilesWithLegacySkills.map(p => p.userId) }
    }
  });

  const profilesNeedingMigration = profilesWithLegacySkills.length - profilesWithUserSkills.length;

  // ============================================
  // SECTION 5: Event Breakdown
  // ============================================
  console.log('📅 Analyzing by event...');

  const events = await prisma.event.findMany({
    include: {
      applications: {
        include: {
          responses: {
            include: {
              question: true
            }
          }
        }
      }
    }
  });

  const eventBreakdown = events.map(event => {
    const applications = event.applications.length;
    const accepted = event.applications.filter(a => a.status === 'ACCEPTED').length;

    const withSkills = event.applications.filter(a =>
      a.responses.some(r => r.question.questionKey === 'technical_skills' && r.answer)
    ).length;

    const withRatings = event.applications.filter(a =>
      a.responses.some(r => r.question.questionKey === 'skill_rating' && r.answer)
    ).length;

    const withExperience = event.applications.filter(a =>
      a.responses.some(r => r.question.questionKey === 'prior_experience' && r.answer)
    ).length;

    return {
      eventName: event.name,
      applications,
      accepted,
      withSkills,
      withRatings,
      withExperience
    };
  }).filter(e => e.applications > 0);

  // ============================================
  // Compile Results
  // ============================================
  return {
    summary: {
      totalUsers,
      usersWithProfiles,
      usersWithLegacySkills,
      usersWithNormalizedSkills,
      totalApplications,
      acceptedApplications
    },
    dataLoss: {
      skillRatingsLost,
      skillRatingsSynced,
      priorExperienceLost,
      priorExperienceSynced,
      applicantsWithoutProfiles,
      applicantsWithoutSkills
    },
    skillCatalog: {
      totalSkills,
      skillsWithCategories,
      skillsWithoutCategories,
      averagePopularity,
      topSkills
    },
    dataQuality: {
      duplicateVariations,
      orphanedUserSkills,
      profilesNeedingMigration
    },
    eventBreakdown
  };
}

function formatReport(results: AuditResults): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('  SKILLS DATA AUDIT REPORT');
  lines.push('  Generated: ' + new Date().toISOString());
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  // Summary Section
  lines.push('📊 SUMMARY STATISTICS');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(`Total Users:                    ${results.summary.totalUsers}`);
  lines.push(`Users with Profiles:            ${results.summary.usersWithProfiles} (${Math.round(results.summary.usersWithProfiles / results.summary.totalUsers * 100)}%)`);
  lines.push(`Users with Legacy Skills:       ${results.summary.usersWithLegacySkills}`);
  lines.push(`Users with Normalized Skills:   ${results.summary.usersWithNormalizedSkills}`);
  lines.push(`Total Applications:             ${results.summary.totalApplications}`);
  lines.push(`Accepted Applications:          ${results.summary.acceptedApplications}`);
  lines.push('');

  // Data Loss Section
  lines.push('🔴 DATA LOSS ANALYSIS');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push('');
  lines.push('Skill Ratings:');
  lines.push(`  ❌ Lost (not synced):          ${results.dataLoss.skillRatingsLost}`);
  lines.push(`  ✅ Synced:                     ${results.dataLoss.skillRatingsSynced}`);
  lines.push(`  📊 Loss Rate:                  ${Math.round(results.dataLoss.skillRatingsLost / (results.dataLoss.skillRatingsLost + results.dataLoss.skillRatingsSynced) * 100)}%`);
  lines.push('');
  lines.push('Prior Experience:');
  lines.push(`  ❌ Lost (not in bio):          ${results.dataLoss.priorExperienceLost}`);
  lines.push(`  ✅ Possibly Synced:            ${results.dataLoss.priorExperienceSynced}`);
  lines.push(`  ⚠️  Note: This is estimated (checks bio field only)`);
  lines.push('');
  lines.push('Profile Completeness:');
  lines.push(`  ❌ Accepted without profiles:  ${results.dataLoss.applicantsWithoutProfiles}`);
  lines.push(`  ❌ Profiles without skills:    ${results.dataLoss.applicantsWithoutSkills}`);
  lines.push('');

  // Skill Catalog Section
  lines.push('📚 SKILL CATALOG STATUS');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(`Total Skills in Catalog:        ${results.skillCatalog.totalSkills}`);
  lines.push(`Skills with Categories:         ${results.skillCatalog.skillsWithCategories} (${Math.round(results.skillCatalog.skillsWithCategories / results.skillCatalog.totalSkills * 100)}%)`);
  lines.push(`Skills without Categories:      ${results.skillCatalog.skillsWithoutCategories}`);
  lines.push(`Average Popularity:             ${results.skillCatalog.averagePopularity.toFixed(1)}`);
  lines.push('');
  lines.push('Top 10 Most Popular Skills:');
  results.skillCatalog.topSkills.forEach((skill, idx) => {
    const category = skill.category ?? 'Uncategorized';
    lines.push(`  ${idx + 1}. ${skill.name.padEnd(25)} (${skill.popularity} users) [${category}]`);
  });
  lines.push('');

  // Data Quality Section
  lines.push('⚠️  DATA QUALITY ISSUES');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(`Orphaned UserSkills records:    ${results.dataQuality.orphanedUserSkills}`);
  lines.push(`Profiles needing migration:     ${results.dataQuality.profilesNeedingMigration}`);
  lines.push('');

  if (results.dataQuality.duplicateVariations.length > 0) {
    lines.push('Skill Duplicates/Variations (Top 20):');
    results.dataQuality.duplicateVariations.forEach((dup, idx) => {
      lines.push(`  ${idx + 1}. ${dup.variations.join(', ')}`);
      lines.push(`     (${dup.count} variations)`);
    });
  } else {
    lines.push('No duplicate variations found ✅');
  }
  lines.push('');

  // Event Breakdown Section
  lines.push('📅 BREAKDOWN BY EVENT');
  lines.push('─────────────────────────────────────────────────────────');
  if (results.eventBreakdown.length > 0) {
    results.eventBreakdown.forEach(event => {
      lines.push(`\n${event.eventName}:`);
      lines.push(`  Applications:          ${event.applications}`);
      lines.push(`  Accepted:              ${event.accepted}`);
      lines.push(`  With Skills:           ${event.withSkills} (${Math.round(event.withSkills / event.applications * 100)}%)`);
      lines.push(`  With Ratings:          ${event.withRatings} (${Math.round(event.withRatings / event.applications * 100)}%)`);
      lines.push(`  With Prior Experience: ${event.withExperience} (${Math.round(event.withExperience / event.applications * 100)}%)`);
    });
  } else {
    lines.push('No events found');
  }
  lines.push('');

  // Recommendations Section
  lines.push('💡 RECOMMENDATIONS');
  lines.push('─────────────────────────────────────────────────────────');

  const recommendations: string[] = [];

  if (results.dataLoss.skillRatingsLost > 0) {
    recommendations.push(`🔴 CRITICAL: ${results.dataLoss.skillRatingsLost} skill ratings are lost. Run migrate-skill-ratings.ts`);
  }

  if (results.dataLoss.priorExperienceLost > 10) {
    recommendations.push(`🔴 CRITICAL: ${results.dataLoss.priorExperienceLost} prior experience entries may be lost. Run migrate-prior-experience.ts`);
  }

  if (results.dataLoss.applicantsWithoutProfiles > 0) {
    recommendations.push(`⚠️  WARNING: ${results.dataLoss.applicantsWithoutProfiles} accepted applicants have no profiles`);
  }

  if (results.dataQuality.profilesNeedingMigration > 0) {
    recommendations.push(`📊 INFO: ${results.dataQuality.profilesNeedingMigration} profiles need migration to normalized skills. Run normalize-all-skills.ts`);
  }

  if (results.skillCatalog.skillsWithoutCategories > 5) {
    recommendations.push(`📊 INFO: ${results.skillCatalog.skillsWithoutCategories} skills need categorization. Run categorize-skills.ts`);
  }

  if (results.dataQuality.duplicateVariations.length > 0) {
    recommendations.push(`⚠️  WARNING: ${results.dataQuality.duplicateVariations.length} skill duplicates found. Review and merge manually`);
  }

  if (recommendations.length > 0) {
    recommendations.forEach(rec => lines.push(rec));
  } else {
    lines.push('✅ All systems healthy! No immediate actions needed.');
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}

// Main execution
async function main() {
  try {
    const args = process.argv.slice(2);
    const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'text';

    const results = await runAudit();

    if (format === 'json') {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(formatReport(results));
    }

    // Exit with error code if critical issues found
    const criticalIssues = results.dataLoss.skillRatingsLost > 0 || results.dataLoss.priorExperienceLost > 10;
    process.exit(criticalIssues ? 1 : 0);

  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
