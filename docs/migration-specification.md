# Migration Scripts - Detailed Specification

## Overview

This document specifies exactly what each migration script will do, including field-by-field mappings, data transformations, and edge cases.

---

## Migration 1: Skill Ratings Migration

### Script Name
`scripts/migrate-skill-ratings.ts`

### Purpose
Sync skill expertise ratings (1-10 scale) from ApplicationResponse to UserSkills.experienceLevel

### Source Data

**Table**: `ApplicationResponse`
**Conditions**:
- `question.questionKey = 'skill_rating'`
- `answer IS NOT NULL AND answer != ''`

**Fields Used**:
- `answer` (string) - Contains rating like "8", "9", "10"
- `applicationId` - To link to application
- `application.userId` - The user who provided the rating

**Related Data Needed**:
- From same application: `technical_skills` question response
- Format: JSON array like `["Designer", "Developer", "Researcher"]`

### Target Data

**Table**: `UserSkills`
**Fields Updated**:
- `experienceLevel` (Int, nullable) - Will be set to parsed rating value
- `updatedAt` - Timestamp of migration

**Table**: `Skills`
**Fields Updated**:
- `popularity` (Int) - Increment for each user using this skill

### Detailed Data Flow

#### Step 1: Extract Ratings from ApplicationResponse

```sql
SELECT
  ar_rating.answer as rating,
  ar_rating.applicationId,
  a.userId,
  ar_skills.answer as skills_json
FROM ApplicationResponse ar_rating
JOIN Application a ON a.id = ar_rating.applicationId
JOIN ApplicationResponse ar_skills ON ar_skills.applicationId = a.id
JOIN ApplicationQuestion aq_rating ON aq_rating.id = ar_rating.questionId
JOIN ApplicationQuestion aq_skills ON aq_skills.id = ar_skills.questionId
WHERE aq_rating.questionKey = 'skill_rating'
  AND aq_skills.questionKey = 'technical_skills'
  AND ar_rating.answer IS NOT NULL
  AND ar_rating.answer != ''
```

**Example Output**:
```typescript
{
  userId: "cmewdy2ki0019jr049a1tvz9p",
  rating: "8",
  skills: '["Developer", "Researcher"]'
}
```

#### Step 2: Parse and Validate Data

```typescript
// Parse rating (handle string to number conversion)
const ratingValue = parseInt(answer);
if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 10) {
  log.warning(`Invalid rating for user ${userId}: ${answer}`);
  continue; // Skip this record
}

// Parse skills array
const skillNames = JSON.parse(skills_json) as string[];
if (!Array.isArray(skillNames) || skillNames.length === 0) {
  log.warning(`No skills for user ${userId}`);
  continue;
}
```

#### Step 3: Find or Create Skills in Catalog

For each skill name in the array:

```typescript
for (const skillName of skillNames) {
  // 1. Normalize the skill name
  const normalizedName = skillName.trim();

  // 2. Find existing skill (case-insensitive)
  let skill = await prisma.skills.findFirst({
    where: {
      name: {
        equals: normalizedName,
        mode: 'insensitive'
      }
    }
  });

  // 3. If not found, create it
  if (!skill) {
    skill = await prisma.skills.create({
      data: {
        name: normalizedName,
        category: inferCategory(normalizedName), // Helper function
        popularity: 0
      }
    });
    log.info(`Created new skill: ${normalizedName}`);
  }

  // Store skill ID for next step
  skillIds.push(skill.id);
}
```

#### Step 4: Create/Update UserSkills Records

```typescript
for (const skillId of skillIds) {
  // Check if UserSkills record already exists
  const existingUserSkill = await prisma.userSkills.findUnique({
    where: {
      userId_skillId: {
        userId: userId,
        skillId: skillId
      }
    }
  });

  if (existingUserSkill) {
    // Update existing record
    await prisma.userSkills.update({
      where: { id: existingUserSkill.id },
      data: {
        experienceLevel: ratingValue, // KEY MIGRATION: Set the rating here
        updatedAt: new Date()
      }
    });
    log.info(`Updated UserSkills: ${userId} → ${skillName} (level ${ratingValue})`);
  } else {
    // Create new record
    await prisma.userSkills.create({
      data: {
        userId: userId,
        skillId: skillId,
        experienceLevel: ratingValue, // KEY MIGRATION: Set the rating here
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    log.info(`Created UserSkills: ${userId} → ${skillName} (level ${ratingValue})`);
  }

  // Increment skill popularity
  await prisma.skills.update({
    where: { id: skillId },
    data: {
      popularity: { increment: 1 }
    }
  });
}
```

### Edge Cases Handled

1. **Invalid Ratings**
   - Non-numeric values → Skip with warning
   - Out of range (< 1 or > 10) → Skip with warning
   - Empty/null values → Skip silently

2. **Missing Skills**
   - technical_skills question not answered → Skip user with warning
   - Empty skills array → Skip user with warning
   - Malformed JSON → Skip user with error log

3. **Skill Name Variations**
   - Case-insensitive matching (React = react)
   - Whitespace trimming
   - New skills created if no match found

4. **Duplicate UserSkills**
   - Check for existing record first
   - Update if exists (preserves created timestamp)
   - Only create if doesn't exist

5. **Multiple Applications per User**
   - Use most recent application's rating
   - Log if conflicting ratings found

### Expected Results

**Before Migration**:
```sql
SELECT COUNT(*) FROM UserSkills WHERE experienceLevel IS NOT NULL;
-- Result: 0
```

**After Migration**:
```sql
SELECT COUNT(*) FROM UserSkills WHERE experienceLevel IS NOT NULL;
-- Result: ~150 (one per user with skill_rating response)

SELECT userId, skillId, experienceLevel
FROM UserSkills
WHERE userId = 'cmewdy2ki0019jr049a1tvz9p';
-- Example Result:
-- cmewdy2ki0019jr049a1tvz9p | skill_react_id | 8
-- cmewdy2ki0019jr049a1tvz9p | skill_typescript_id | 8
```

### Dry Run Output Example

```
🔄 Skill Ratings Migration (DRY RUN)
=====================================

Found 150 users with skill_rating responses

User: cmewdy2ki0019jr049a1tvz9p
  Rating: 8/10
  Skills: Developer, Researcher
  Actions:
    ✓ Find/Create skill "Developer" → skill_abc123
    ✓ Find/Create skill "Researcher" → skill_def456
    ✓ Create UserSkills(cmewdy..., skill_abc123, experienceLevel=8)
    ✓ Create UserSkills(cmewdy..., skill_def456, experienceLevel=8)
    ✓ Increment popularity for "Developer" (45 → 46)
    ✓ Increment popularity for "Researcher" (32 → 33)

... (149 more users)

Summary:
  Users processed: 150
  Skills created: 23
  UserSkills created: 347
  UserSkills updated: 0
  Errors: 0
  Warnings: 5 (invalid ratings skipped)
```

---

## Migration 2: Prior Experience Migration

### Script Name
`scripts/migrate-prior-experience.ts`

### Purpose
Sync prior experience descriptions from ApplicationResponse to UserProfile.priorExperience

### Source Data

**Table**: `ApplicationResponse`
**Conditions**:
- `question.questionKey = 'prior_experience'`
- `answer IS NOT NULL AND answer != ''`

**Fields Used**:
- `answer` (string) - Contains experience description (textarea)
- `applicationId` - To link to application
- `application.userId` - The user who provided the experience

### Target Data

**Table**: `UserProfile`
**Fields Updated**:
- `priorExperience` (String, Text, nullable) - Will be set to experience description
- `skillsSource` (String, nullable) - Will be set to 'application'
- `skillsSyncedAt` (DateTime, nullable) - Will be set to migration timestamp

### Detailed Data Flow

#### Step 1: Extract Prior Experience from ApplicationResponse

```sql
SELECT
  ar.answer as experience_text,
  ar.applicationId,
  a.userId,
  a.status,
  a.createdAt as application_date
FROM ApplicationResponse ar
JOIN Application a ON a.id = ar.applicationId
JOIN ApplicationQuestion aq ON aq.id = ar.questionId
WHERE aq.questionKey = 'prior_experience'
  AND ar.answer IS NOT NULL
  AND ar.answer != ''
ORDER BY a.createdAt DESC
```

**Example Output**:
```typescript
{
  userId: "cmewdy2ki0019jr049a1tvz9p",
  experienceText: "I've been working in DeFi for 3 years, built a DEX aggregator...",
  applicationDate: "2024-08-15T10:30:00Z",
  status: "ACCEPTED"
}
```

#### Step 2: Find or Create UserProfile

```typescript
// Check if user already has a profile
let profile = await prisma.userProfile.findUnique({
  where: { userId: userId }
});

if (!profile) {
  // Create new profile if doesn't exist
  profile = await prisma.userProfile.create({
    data: {
      userId: userId,
      // Set defaults for required fields if any
    }
  });
  log.info(`Created new profile for user ${userId}`);
}
```

#### Step 3: Update Profile with Experience

```typescript
// Check if priorExperience is already set
const existingExperience = profile.priorExperience;

if (existingExperience && existingExperience.trim()) {
  // Profile already has experience text

  if (existingExperience.includes(experienceText)) {
    // Exact match - skip (already synced)
    log.info(`Experience already synced for ${userId}`);
    continue;
  }

  // Different text - needs decision
  if (options.overwrite) {
    // Replace with new text
    await prisma.userProfile.update({
      where: { userId: userId },
      data: {
        priorExperience: experienceText,
        skillsSource: 'application',
        skillsSyncedAt: new Date()
      }
    });
    log.warning(`Overwrote existing experience for ${userId}`);
  } else if (options.append) {
    // Append new text
    const combined = `${existingExperience}\n\n---\n\n${experienceText}`;
    await prisma.userProfile.update({
      where: { userId: userId },
      data: {
        priorExperience: combined,
        skillsSource: 'application',
        skillsSyncedAt: new Date()
      }
    });
    log.info(`Appended experience for ${userId}`);
  } else {
    // Default: Skip
    log.warning(`Skipping ${userId} - already has experience (use --overwrite or --append)`);
    continue;
  }
} else {
  // No existing experience - safe to set
  await prisma.userProfile.update({
    where: { userId: userId },
    data: {
      priorExperience: experienceText,
      skillsSource: 'application',
      skillsSyncedAt: new Date()
    }
  });
  log.info(`Set prior experience for ${userId} (${experienceText.length} chars)`);
}
```

### Field Mappings

| Source | Target | Transformation |
|--------|--------|----------------|
| `ApplicationResponse.answer` | `UserProfile.priorExperience` | Direct copy (no transformation) |
| (constant) | `UserProfile.skillsSource` | Set to 'application' |
| `new Date()` | `UserProfile.skillsSyncedAt` | Current timestamp |

### Edge Cases Handled

1. **No Existing Profile**
   - Create new UserProfile record
   - Set priorExperience field
   - Continue with normal flow

2. **Profile Already Has Experience**
   - **Default**: Skip (don't overwrite)
   - **--overwrite flag**: Replace with application data
   - **--append flag**: Append with separator
   - Log decision for manual review

3. **Multiple Applications per User**
   - Use most recent application (ORDER BY createdAt DESC)
   - Log if multiple found

4. **Empty/Whitespace-only Text**
   - Skip with info log
   - Don't overwrite existing data with empty string

5. **Very Long Text**
   - Check length (warn if > 5000 chars)
   - Truncate if database field has limit
   - Log truncation warning

### Expected Results

**Before Migration**:
```sql
SELECT COUNT(*) FROM UserProfile WHERE priorExperience IS NOT NULL;
-- Result: 0 (field doesn't exist yet)
```

**After Migration**:
```sql
SELECT COUNT(*) FROM UserProfile WHERE priorExperience IS NOT NULL;
-- Result: ~124

SELECT userId, LEFT(priorExperience, 100) as preview
FROM UserProfile
WHERE userId = 'cmewdy2ki0019jr049a1tvz9p';
-- Example Result:
-- cmewdy2ki0019jr049a1tvz9p | "I've been working in DeFi for 3 years, built a DEX aggregator, contributed to Uniswap..."
```

### Dry Run Output Example

```
🔄 Prior Experience Migration (DRY RUN)
========================================

Found 144 users with prior_experience responses

User: cmewdy2ki0019jr049a1tvz9p
  Application: 2024-08-15
  Status: ACCEPTED
  Experience Length: 487 characters
  Preview: "I've been working in DeFi for 3 years, built a DEX..."
  Actions:
    ✓ Profile exists
    ✓ No existing priorExperience
    ✓ Set priorExperience (487 chars)
    ✓ Set skillsSource = 'application'
    ✓ Set skillsSyncedAt = 2025-10-30T01:36:14Z

User: user_xyz123
  Application: 2024-07-20
  Status: ACCEPTED
  Experience Length: 1203 characters
  Preview: "I have extensive experience in climate tech..."
  Actions:
    ⚠️  Profile exists
    ⚠️  Already has priorExperience (345 chars)
    ⚠️  SKIP (use --overwrite or --append to update)

... (142 more users)

Summary:
  Users processed: 144
  Profiles created: 4
  Profiles updated: 120
  Skipped (already has data): 20
  Errors: 0
  Warnings: 20 (existing data)
```

---

## Migration 3: Database Schema Update

### Script Name
Migration file generated by Prisma

### Purpose
Add new fields to UserProfile model for storing prior experience and tracking metadata

### Schema Changes

**File**: `prisma/schema.prisma`

```prisma
model UserProfile {
  // ... existing fields ...

  skills              String[]  @default([])  // EXISTING (will keep for backward compat)

  // NEW FIELDS:
  priorExperience     String?   @db.Text      // Rich text field for experience descriptions
  skillsSource        String?   @default("manual")  // "application" | "manual" | "imported"
  skillsSyncedAt      DateTime? // When skills were last synced from application

  // ... rest of fields ...
}
```

### Field Specifications

#### priorExperience
- **Type**: `String?` (nullable)
- **Database Type**: `@db.Text` (unlimited length in Postgres)
- **Purpose**: Store rich experience descriptions from applications
- **Default**: `null`
- **Example Values**:
  ```
  "I've been working in DeFi for 3 years, built a DEX aggregator,
   contributed to Uniswap v3 integrations, and led a team building
   a yield optimization protocol. Previously worked at ConsenSys on
   Ethereum infrastructure..."
  ```

#### skillsSource
- **Type**: `String?` (nullable)
- **Default**: `"manual"`
- **Purpose**: Track where skills data came from
- **Allowed Values**:
  - `"application"` - Synced from application form
  - `"manual"` - User edited profile directly
  - `"imported"` - Bulk import from external source
- **Example**: `"application"`

#### skillsSyncedAt
- **Type**: `DateTime?` (nullable)
- **Purpose**: Track when skills were last synced from application
- **Default**: `null`
- **Set By**: Migration scripts and profile sync logic
- **Example**: `2025-10-30T01:36:14.554Z`

### Migration Command

```bash
npx prisma migrate dev --name "add-prior-experience-and-metadata-to-profiles"
```

### Generated SQL (Approximate)

```sql
-- AlterTable
ALTER TABLE "UserProfile"
ADD COLUMN "priorExperience" TEXT,
ADD COLUMN "skillsSource" TEXT DEFAULT 'manual',
ADD COLUMN "skillsSyncedAt" TIMESTAMP(3);
```

### Rollback SQL (If Needed)

```sql
-- AlterTable
ALTER TABLE "UserProfile"
DROP COLUMN "priorExperience",
DROP COLUMN "skillsSource",
DROP COLUMN "skillsSyncedAt";
```

---

## Complete Data Mapping Summary

### ApplicationResponse → UserSkills

| Source Field | Source Table | Target Field | Target Table | Transformation |
|-------------|--------------|--------------|--------------|----------------|
| `answer` (where questionKey='skill_rating') | ApplicationResponse | `experienceLevel` | UserSkills | `parseInt(answer)` |
| `answer` (where questionKey='technical_skills') | ApplicationResponse | `skillId` | UserSkills | JSON parse → skill name → find/create skill → skill.id |
| `application.userId` | Application | `userId` | UserSkills | Direct copy |
| (auto) | - | `createdAt` | UserSkills | `new Date()` |
| (auto) | - | `updatedAt` | UserSkills | `new Date()` |

### ApplicationResponse → UserProfile

| Source Field | Source Table | Target Field | Target Table | Transformation |
|-------------|--------------|--------------|--------------|----------------|
| `answer` (where questionKey='prior_experience') | ApplicationResponse | `priorExperience` | UserProfile | Direct copy |
| (constant) | - | `skillsSource` | UserProfile | Set to 'application' |
| (auto) | - | `skillsSyncedAt` | UserProfile | `new Date()` |

### ApplicationResponse → Skills

| Source Field | Source Table | Target Field | Target Table | Transformation |
|-------------|--------------|--------------|--------------|----------------|
| `answer` (where questionKey='technical_skills') | ApplicationResponse | `name` | Skills | JSON parse → skill name |
| (inferred) | - | `category` | Skills | `inferCategory(name)` |
| (increment) | - | `popularity` | Skills | `+1` for each user |

---

## Verification Queries

After running migrations, run these queries to verify success:

### Check Skill Ratings Migration

```sql
-- Should return ~150 rows
SELECT COUNT(*)
FROM UserSkills
WHERE experienceLevel IS NOT NULL;

-- Should show ratings distribution
SELECT experienceLevel, COUNT(*) as count
FROM UserSkills
WHERE experienceLevel IS NOT NULL
GROUP BY experienceLevel
ORDER BY experienceLevel;

-- Example specific user
SELECT
  u.name,
  s.name as skill_name,
  us.experienceLevel
FROM UserSkills us
JOIN User u ON u.id = us.userId
JOIN Skills s ON s.id = us.skillId
WHERE us.userId = 'cmewdy2ki0019jr049a1tvz9p';
```

### Check Prior Experience Migration

```sql
-- Should return ~124 rows
SELECT COUNT(*)
FROM UserProfile
WHERE priorExperience IS NOT NULL;

-- Should show metadata is set
SELECT COUNT(*)
FROM UserProfile
WHERE skillsSource = 'application';

-- Example specific user
SELECT
  u.name,
  LENGTH(up.priorExperience) as experience_length,
  LEFT(up.priorExperience, 100) as preview,
  up.skillsSource,
  up.skillsSyncedAt
FROM UserProfile up
JOIN User u ON u.id = up.userId
WHERE up.userId = 'cmewdy2ki0019jr049a1tvz9p';
```

### Check Data Integrity

```sql
-- All UserSkills should have valid users
SELECT COUNT(*)
FROM UserSkills us
LEFT JOIN User u ON u.id = us.userId
WHERE u.id IS NULL;
-- Should return 0

-- All UserSkills should have valid skills
SELECT COUNT(*)
FROM UserSkills us
LEFT JOIN Skills s ON s.id = us.skillId
WHERE s.id IS NULL;
-- Should return 0

-- All UserProfiles should have valid users
SELECT COUNT(*)
FROM UserProfile up
LEFT JOIN User u ON u.id = up.userId
WHERE u.id IS NULL;
-- Should return 0
```

---

## Execution Plan

### Pre-Migration

1. ✅ Run audit script (DONE)
2. ✅ Review this specification document
3. [ ] Backup database
   ```bash
   pg_dump ftc_platform > backup-before-migration.sql
   ```
4. [ ] Run schema migration
   ```bash
   npx prisma migrate dev --name "add-prior-experience-and-metadata-to-profiles"
   npx prisma generate
   ```

### Migration Execution

5. [ ] Run skill ratings migration (dry run)
   ```bash
   bun run scripts/migrate-skill-ratings.ts
   # Review output
   ```
6. [ ] Run skill ratings migration (execute)
   ```bash
   bun run scripts/migrate-skill-ratings.ts --execute
   ```
7. [ ] Run prior experience migration (dry run)
   ```bash
   bun run scripts/migrate-prior-experience.ts
   # Review output
   ```
8. [ ] Run prior experience migration (execute)
   ```bash
   bun run scripts/migrate-prior-experience.ts --execute
   ```

### Post-Migration

9. [ ] Run verification queries
10. [ ] Run audit script again to compare
    ```bash
    bun run scripts/audit-skill-data.ts > audit-after-migration.txt
    ```
11. [ ] Check specific user profiles manually
12. [ ] Update profile sync logic to prevent future data loss

---

## Success Criteria

✅ **Migration is successful if**:
- All 150 skill ratings are synced to UserSkills.experienceLevel
- All 124+ prior experience texts are in UserProfile.priorExperience
- No orphaned records (all foreign keys valid)
- Audit script shows 0% loss rate
- Specific user profiles display correctly

❌ **Rollback if**:
- More than 5% of records fail to migrate
- Data integrity checks fail
- Critical errors in migration logs

---

**Document Status**: Ready for Review
**Next Step**: Get approval → Build migration scripts
