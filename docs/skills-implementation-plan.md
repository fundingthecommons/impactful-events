# Skills Searchability Implementation Plan

## Overview

This plan implements a complete solution for surfacing skills and experience data from applications into searchable user profiles. The work is divided into 4 phases with clear deliverables and testing criteria.

**Timeline**: 2-3 weeks
**Risk Level**: Medium (database migrations involved)
**Impact**: High (enables talent discovery and hiring)

---

## Phase 1: Audit & Fix Data Loss (Days 1-2)

### Goal
Understand current data loss and prevent future loss

### Tasks

#### 1.1 Create Data Audit Script
**File**: `scripts/audit-skill-data.ts`

**What it does**:
- Counts users with skills in different systems
- Identifies applications with unsynced skill data
- Lists most common skills not in catalog
- Generates data quality report

**Output**:
```
Skills Data Audit Report
========================

Users with UserProfile.skills: 150
Users with UserSkills records: 45
Users with applications but no skills: 23

Applications with skill_rating: 178
Applications with skill_rating synced: 0 ❌

Applications with prior_experience: 165
Applications with prior_experience synced: 12

Most Common Skills (not in catalog):
  - React: 45 occurrences
  - Python: 38 occurrences
  - Blockchain: 35 occurrences
  ...

Data Quality Issues:
  - Skill duplicates: 28 variations
  - Missing categories: 67 skills
  - Orphaned ApplicationResponses: 5
```

**Acceptance Criteria**:
- Report runs without errors
- Identifies all data loss gaps
- Generates actionable recommendations

#### 1.2 Add priorExperience Field to Schema
**File**: `prisma/schema.prisma`

**Changes**:
```prisma
model UserProfile {
  // ... existing fields

  // NEW: Store rich experience descriptions from applications
  priorExperience     String?   @db.Text

  // NEW: Metadata for tracking
  skillsSource        String?   @default("manual") // "application" | "manual" | "imported"
  skillsSyncedAt      DateTime?
}
```

**Migration**:
```bash
npx prisma migrate dev --name "add-prior-experience-to-profiles"
npx prisma generate
```

**Acceptance Criteria**:
- Migration creates without errors
- Field accessible in TypeScript with proper types
- No data loss on existing profiles

#### 1.3 Update Profile API Types
**File**: `src/server/api/routers/profile.ts`

**Changes**:
```typescript
const profileUpdateSchema = z.object({
  // ... existing fields
  priorExperience: z.string().max(2000).optional(),
});
```

**Acceptance Criteria**:
- TypeScript compiles without errors
- API accepts priorExperience in updates

#### 1.4 Create Skill Ratings Migration Script
**File**: `scripts/migrate-skill-ratings.ts`

**What it does**:
1. Finds all ApplicationResponses with skill_rating
2. Matches to technical_skills answers
3. Normalizes skill names to catalog
4. Creates/updates UserSkills with experienceLevel
5. Logs all changes for audit trail

**Features**:
- Dry-run mode (default)
- Execute mode (--execute flag)
- Progress bar for large datasets
- Error handling and rollback
- Detailed logging

**Usage**:
```bash
# See what would change
bun run scripts/migrate-skill-ratings.ts

# Actually execute changes
bun run scripts/migrate-skill-ratings.ts --execute

# Specific event only
bun run scripts/migrate-skill-ratings.ts --event-id clx123
```

**Acceptance Criteria**:
- Dry-run shows accurate preview
- Execute mode preserves all data
- Creates UserSkills records correctly
- Logs all actions for audit
- Handles edge cases (missing skills, invalid ratings)

#### 1.5 Create Prior Experience Migration Script
**File**: `scripts/migrate-prior-experience.ts`

**What it does**:
1. Finds all ApplicationResponses with prior_experience
2. Gets corresponding UserProfile
3. Updates priorExperience field
4. Marks as synced with timestamp

**Features**:
- Dry-run mode
- Handles missing profiles gracefully
- Deduplicates if already synced
- Progress tracking

**Usage**:
```bash
bun run scripts/migrate-prior-experience.ts
bun run scripts/migrate-prior-experience.ts --execute
```

**Acceptance Criteria**:
- Syncs all prior experience text
- No duplicates created
- Updates timestamp metadata
- Preserves existing profile data

#### 1.6 Update Profile Sync Logic
**File**: `src/server/api/routers/profile.ts` (lines 928-939)

**Current Code**:
```typescript
if (responseMap.has("technical_skills")) {
  const appSkills = JSON.parse(responseMap.get("technical_skills")!) as string[];
  const profileSkills = currentProfile?.skills ?? [];
  const mergedSkills = [...new Set([...profileSkills, ...appSkills])];
  syncData.skills = mergedSkills;
}
```

**New Code**:
```typescript
// Sync skills with ratings
if (responseMap.has("technical_skills")) {
  const appSkills = JSON.parse(responseMap.get("technical_skills")!) as string[];
  const skillRating = responseMap.has("skill_rating")
    ? parseInt(responseMap.get("skill_rating")!)
    : undefined;

  // Normalize and create UserSkills records
  await syncSkillsToUserSkills(
    userId,
    appSkills,
    skillRating,
    ctx.db
  );

  // Keep legacy field for backward compatibility
  const profileSkills = currentProfile?.skills ?? [];
  const mergedSkills = [...new Set([...profileSkills, ...appSkills])];
  syncData.skills = mergedSkills;
}

// Sync prior experience
if (responseMap.has("prior_experience")) {
  const priorExp = responseMap.get("prior_experience")!;
  if (priorExp && priorExp.trim()) {
    syncData.priorExperience = priorExp;
  }
}

// Track sync metadata
syncData.skillsSource = "application";
syncData.skillsSyncedAt = new Date();
```

**Acceptance Criteria**:
- Future syncs preserve all data
- No more data loss
- Backward compatible with existing code
- Tests pass

### Phase 1 Deliverables
- [x] Audit script showing current state
- [x] Database schema updated
- [x] Two migration scripts ready
- [x] Profile sync logic fixed
- [x] Documentation updated

### Phase 1 Testing
```bash
# Run audit to establish baseline
bun run scripts/audit-skill-data.ts > audit-before.txt

# Run migrations
bun run scripts/migrate-skill-ratings.ts --execute
bun run scripts/migrate-prior-experience.ts --execute

# Run audit again to verify
bun run scripts/audit-skill-data.ts > audit-after.txt

# Compare results
diff audit-before.txt audit-after.txt

# Test new application sync
# 1. Create test application with skills and rating
# 2. Sync to profile
# 3. Verify UserSkills created with experienceLevel
# 4. Verify priorExperience populated
```

---

## Phase 2: Normalize Skills System (Days 3-5)

### Goal
Use single normalized Skills catalog for all users

### Tasks

#### 2.1 Create Skill Normalization Utilities
**File**: `src/utils/skillNormalization.ts`

**Functions**:
```typescript
// Find or create skill in catalog
export async function normalizeSkill(
  db: PrismaClient,
  skillName: string
): Promise<Skill>

// Infer category from skill name
export function inferCategory(skillName: string): SkillCategory

// Detect duplicates (case-insensitive, fuzzy match)
export async function findSimilarSkills(
  db: PrismaClient,
  skillName: string
): Promise<Skill[]>

// Merge duplicate skills
export async function mergeSkills(
  db: PrismaClient,
  keepId: string,
  mergeIds: string[]
): Promise<void>
```

**Acceptance Criteria**:
- Handles case variations (react → React)
- Infers categories correctly (>80% accuracy)
- Finds fuzzy matches (React.js ↔ ReactJS)
- Merge preserves all UserSkills references

#### 2.2 Create Skill Categories Enum
**File**: `prisma/schema.prisma`

**Changes**:
```prisma
enum SkillCategory {
  FRONTEND
  BACKEND
  BLOCKCHAIN
  DESIGN
  DATA_SCIENCE
  DEVOPS
  MOBILE
  PRODUCT
  MARKETING
  OTHER
}

model Skills {
  id         String        @id @default(cuid())
  name       String        @unique
  category   SkillCategory @default(OTHER)
  popularity Int           @default(0)
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  userSkills UserSkills[]

  @@index([category])
  @@index([popularity])
}
```

**Migration**:
```bash
npx prisma migrate dev --name "add-skill-category-enum"
npx prisma generate
```

**Acceptance Criteria**:
- Enum defined correctly
- Default value works
- Existing skills get OTHER category
- TypeScript types generated

#### 2.3 Backfill Skill Categories
**File**: `scripts/categorize-skills.ts`

**What it does**:
- Reads all Skills records
- Uses inferCategory() to assign categories
- Updates records in batches
- Generates report of categorization

**Usage**:
```bash
bun run scripts/categorize-skills.ts
bun run scripts/categorize-skills.ts --execute
```

**Acceptance Criteria**:
- All skills have categories assigned
- >80% accuracy on manual review
- No skills lost in process

#### 2.4 Update DynamicApplicationForm
**File**: `src/app/_components/DynamicApplicationForm.tsx`

**Current**: MULTISELECT with hardcoded options
**New**: Use SkillsMultiSelect component

**Changes**:
```tsx
// OLD
{question.questionType === "MULTISELECT" && (
  <MultiSelect
    data={question.options ?? []}
    value={formValues[question.questionKey] as string[] || []}
    onChange={(value) => handleChange(question.questionKey, value)}
  />
)}

// NEW - For technical_skills question specifically
{question.questionKey === "technical_skills" ? (
  <SkillsMultiSelect
    value={formValues[question.questionKey] as string[] || []}
    onChange={(value) => handleChange(question.questionKey, value)}
    label={currentLanguage === "es" ? question.questionEs : question.questionEn}
    required={question.required}
  />
) : question.questionType === "MULTISELECT" ? (
  <MultiSelect
    data={question.options ?? []}
    value={formValues[question.questionKey] as string[] || []}
    onChange={(value) => handleChange(question.questionKey, value)}
  />
) : null}
```

**Acceptance Criteria**:
- Technical skills use SkillsMultiSelect
- Other multiselects still work normally
- Stores skill IDs (not names)
- Autocomplete works
- Can create new skills inline

#### 2.5 Update SkillsMultiSelect Component
**File**: `src/app/_components/SkillsMultiSelect.tsx`

**Enhancements**:
- Show skill categories in dropdown
- Display popularity count
- Better search/filter
- Keyboard navigation

**Acceptance Criteria**:
- Loads skills grouped by category
- Shows popularity indicators
- Creates new skills with proper category
- Responsive and accessible

#### 2.6 Normalize Existing UserProfile.skills
**File**: `scripts/normalize-all-skills.ts`

**What it does**:
1. Reads all UserProfile.skills arrays
2. For each skill string:
   - Find/create in Skills catalog
   - Create UserSkills record
   - Increment popularity
3. Marks profile as migrated
4. Keeps original array for backward compatibility

**Usage**:
```bash
bun run scripts/normalize-all-skills.ts
bun run scripts/normalize-all-skills.ts --execute
```

**Acceptance Criteria**:
- All user skills in UserSkills table
- Popularity counts accurate
- No duplicates created
- Original data preserved

#### 2.7 Update Profile API to Return Normalized Skills
**File**: `src/server/api/routers/profile.ts`

**New Endpoint**:
```typescript
getUserSkills: publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ ctx, input }) => {
    return await ctx.db.userSkills.findMany({
      where: { userId: input.userId },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            category: true,
            popularity: true
          }
        }
      },
      orderBy: [
        { experienceLevel: 'desc' },
        { skill: { popularity: 'desc' } }
      ]
    });
  }),
```

**Update Existing Endpoints**:
```typescript
// getProfile - Include UserSkills
include: {
  projects: true,
  user: { select: { id: true, name: true, image: true } },
  userSkills: {
    include: {
      skill: {
        select: { id: true, name: true, category: true }
      }
    }
  }
}
```

**Acceptance Criteria**:
- Returns normalized skills with categories
- Includes experience levels
- Backward compatible (still returns skills array)
- Performance acceptable (<200ms)

### Phase 2 Deliverables
- [x] Skill normalization utilities
- [x] Category enum and migration
- [x] Application form uses SkillsMultiSelect
- [x] All existing skills normalized
- [x] API returns enriched skill data

### Phase 2 Testing
```bash
# Test skill normalization
bun run scripts/categorize-skills.ts --execute
bun run scripts/normalize-all-skills.ts --execute

# Manual testing
# 1. Open application form
# 2. Select skills using new component
# 3. Submit application
# 4. Sync to profile
# 5. Verify UserSkills created with categories
# 6. Check profile displays skills correctly

# Integration test
bun run test:integration -- skills
```

---

## Phase 3: Enhanced Search (Days 6-8)

### Goal
Add category, experience level, and popularity-based search

### Tasks

#### 3.1 Update Search Schema
**File**: `src/server/api/routers/profile.ts`

**Changes**:
```typescript
const profileSearchSchema = z.object({
  search: z.string().optional(),
  skills: z.array(z.string()).optional(),
  skillCategories: z.array(z.enum([
    'FRONTEND',
    'BACKEND',
    'BLOCKCHAIN',
    'DESIGN',
    'DATA_SCIENCE',
    'DEVOPS',
    'MOBILE',
    'PRODUCT',
    'MARKETING',
    'OTHER'
  ])).optional(),
  minExperienceLevel: z.number().min(1).max(10).optional(),
  location: z.string().optional(),
  availableForMentoring: z.boolean().optional(),
  availableForHiring: z.boolean().optional(),
  availableForOfficeHours: z.boolean().optional(),
  limit: z.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
});
```

**Acceptance Criteria**:
- Schema validates correctly
- TypeScript types generated
- Backward compatible with existing calls

#### 3.2 Update Search Query Logic
**File**: `src/server/api/routers/profile.ts`

**Changes**:
```typescript
// Build where clause for UserSkills filter
if (skills?.length || skillCategories?.length || minExperienceLevel) {
  where.userSkills = {
    some: {
      ...(skills?.length && {
        skill: { name: { in: skills } }
      }),
      ...(skillCategories?.length && {
        skill: { category: { in: skillCategories } }
      }),
      ...(minExperienceLevel && {
        experienceLevel: { gte: minExperienceLevel }
      })
    }
  };
}

// Include userSkills in results
include: {
  user: { select: { id: true, name: true, image: true } },
  userSkills: {
    include: {
      skill: {
        select: { id: true, name: true, category: true }
      }
    },
    orderBy: [
      { experienceLevel: 'desc' },
      { skill: { popularity: 'desc' } }
    ]
  }
}
```

**Acceptance Criteria**:
- Category filter works correctly
- Experience level filter works
- Results include enriched skill data
- Performance acceptable with indexes

#### 3.3 Add Database Indexes
**File**: `prisma/schema.prisma`

**Changes**:
```prisma
model UserSkills {
  // ... existing fields

  @@index([experienceLevel])
  @@index([userId, experienceLevel])
}

model Skills {
  // ... existing fields

  @@index([category, popularity])
}
```

**Migration**:
```bash
npx prisma migrate dev --name "add-search-performance-indexes"
```

**Acceptance Criteria**:
- Indexes created successfully
- Query performance improved (test with EXPLAIN ANALYZE)
- No impact on write performance

#### 3.4 Update ProfilesClient UI
**File**: `src/app/profiles/ProfilesClient.tsx`

**New Filters**:
```tsx
interface ProfileFilters {
  search: string;
  skills: string[];
  skillCategories: SkillCategory[];
  minExperienceLevel: number;
  location: string;
  availableForMentoring: boolean | undefined;
  availableForHiring: boolean | undefined;
  availableForOfficeHours: boolean | undefined;
}

// Add category filter
<MultiSelect
  label="Skill Categories"
  placeholder="All categories"
  data={[
    { value: 'FRONTEND', label: 'Frontend Development' },
    { value: 'BACKEND', label: 'Backend Development' },
    { value: 'BLOCKCHAIN', label: 'Blockchain & Web3' },
    { value: 'DESIGN', label: 'Design & UX' },
    { value: 'DATA_SCIENCE', label: 'Data Science & Analytics' },
    { value: 'DEVOPS', label: 'DevOps & Infrastructure' },
    { value: 'MOBILE', label: 'Mobile Development' },
    { value: 'PRODUCT', label: 'Product Management' },
    { value: 'MARKETING', label: 'Marketing & Growth' },
  ]}
  value={filters.skillCategories}
  onChange={(value) => handleFilterChange('skillCategories', value)}
  clearable
/>

// Add experience level slider
<Slider
  label="Minimum Experience Level"
  min={1}
  max={10}
  step={1}
  value={filters.minExperienceLevel}
  onChange={(value) => handleFilterChange('minExperienceLevel', value)}
  marks={[
    { value: 1, label: 'Beginner' },
    { value: 5, label: 'Intermediate' },
    { value: 10, label: 'Expert' }
  ]}
/>
```

**Acceptance Criteria**:
- New filters render correctly
- Filter changes trigger API calls
- Results update in real-time
- URL params sync with filters
- Mobile responsive

#### 3.5 Update Profile Cards to Show Categories
**File**: `src/app/profiles/ProfilesClient.tsx`

**Changes**:
```tsx
{member.userSkills && member.userSkills.length > 0 && (
  <Stack gap={4}>
    {member.userSkills.slice(0, 3).map((userSkill) => (
      <Group key={userSkill.id} gap={4}>
        <Badge
          size="xs"
          variant="light"
          color={getCategoryColor(userSkill.skill.category)}
        >
          {userSkill.skill.name}
        </Badge>
        {userSkill.experienceLevel && (
          <Text size="xs" c="dimmed">
            {userSkill.experienceLevel}/10
          </Text>
        )}
      </Group>
    ))}
    {member.userSkills.length > 3 && (
      <Badge size="xs" variant="outline" color="gray">
        +{member.userSkills.length - 3} more
      </Badge>
    )}
  </Stack>
)}
```

**Acceptance Criteria**:
- Shows skills with categories
- Displays experience levels
- Color-coded by category
- Clean, professional appearance

#### 3.6 Update Skills Dropdown with Popularity
**File**: `src/app/_components/SkillsMultiSelect.tsx`

**Changes**:
```tsx
// Fetch skills with popularity
const { data: skills } = api.skills.getSkills.useQuery();

// Format options with popularity
const skillOptions = skills?.map(skill => ({
  value: skill.id,
  label: `${skill.name} (${skill.popularity} users)`,
  group: skill.category
})) ?? [];

// Sort by popularity within each group
const sortedOptions = sortBy(skillOptions, [
  'group',
  (opt) => -parseInt(opt.label.match(/\((\d+)/)?.[1] ?? '0')
]);
```

**Acceptance Criteria**:
- Shows popularity count
- Grouped by category
- Sorted by popularity within groups
- Search works across all skills

### Phase 3 Deliverables
- [x] Category-based search working
- [x] Experience level filtering working
- [x] Popularity indicators visible
- [x] Database indexes added
- [x] UI updated with new filters

### Phase 3 Testing
```bash
# Performance testing
bun run scripts/test-search-performance.ts

# Manual testing
# 1. Open /profiles
# 2. Filter by category (e.g., "Blockchain")
# 3. Adjust experience level slider
# 4. Verify results match criteria
# 5. Test combinations of filters
# 6. Check mobile responsiveness

# Integration tests
bun run test:integration -- search
```

---

## Phase 4: Talent Discovery Platform (Days 9-12)

### Goal
Build dedicated talent search page with advanced features

### Tasks

#### 4.1 Create Talent Search Page
**Files**:
- `src/app/talent/page.tsx`
- `src/app/talent/TalentSearchClient.tsx`

**Features**:
- Advanced filter panel
- Boolean skill logic (AND/OR/NOT)
- Saved searches
- Export to CSV
- Email alerts for new matches

**Layout**:
```
┌─────────────────────────────────────────┐
│ 🎯 Talent Discovery                     │
│ Find the perfect team members           │
└─────────────────────────────────────────┘

┌─────────────┬───────────────────────────┐
│             │                           │
│  Advanced   │  Search Results (24)      │
│  Filters    │                           │
│             │  ┌─────────────────────┐  │
│  Skills     │  │ John Doe            │  │
│  ☑ React    │  │ Frontend Developer  │  │
│  ☑ Node.js  │  │ 🟢 Available        │  │
│  ☐ Python   │  └─────────────────────┘  │
│             │                           │
│  Category   │  ┌─────────────────────┐  │
│  ☑ Frontend │  │ Jane Smith          │  │
│  ☑ Backend  │  │ Full Stack Eng      │  │
│             │  │ 🟢 Available        │  │
│  Location   │  └─────────────────────┘  │
│  [SF, NYC]  │                           │
│             │  [Load More...]           │
│  [Search]   │                           │
│  [Save]     │  [Export CSV]             │
│             │                           │
└─────────────┴───────────────────────────┘
```

**Acceptance Criteria**:
- Professional, clean design
- Fast, responsive interface
- Mobile-friendly
- Accessible (WCAG AA)

#### 4.2 Add Advanced Filters Component
**File**: `src/app/talent/_components/AdvancedFilters.tsx`

**Features**:
```typescript
interface AdvancedTalentFilters {
  // Skill logic
  requiredSkills: string[];      // Must have ALL
  preferredSkills: string[];     // Nice to have (OR)
  excludedSkills: string[];      // Must NOT have

  // Experience
  minExperienceLevel: number;
  yearsOfExperience: [number, number];

  // Categories
  skillCategories: SkillCategory[];

  // Availability
  availableForHiring: boolean;
  availableForMentoring: boolean;
  availableForOfficeHours: boolean;

  // Profile completeness
  hasGithub: boolean;
  hasProjects: boolean;
  hasLinkedIn: boolean;

  // Location
  locations: string[];
  timezone: string[];

  // Event participation
  completedApplications: string[];  // Event IDs
  acceptedToEvents: string[];

  // Custom
  keywords: string;  // Free text search
}
```

**Acceptance Criteria**:
- All filter types implemented
- Clear visual hierarchy
- Help text for complex filters
- Reset functionality

#### 4.3 Implement Boolean Skill Logic
**File**: `src/server/api/routers/talent.ts` (new router)

**Query Logic**:
```typescript
// Required skills (AND)
if (requiredSkills?.length) {
  where.AND = requiredSkills.map(skillId => ({
    userSkills: {
      some: { skillId }
    }
  }));
}

// Preferred skills (OR)
if (preferredSkills?.length) {
  where.OR = [
    ...(where.OR ?? []),
    {
      userSkills: {
        some: {
          skillId: { in: preferredSkills }
        }
      }
    }
  ];
}

// Excluded skills (NOT)
if (excludedSkills?.length) {
  where.NOT = {
    userSkills: {
      some: {
        skillId: { in: excludedSkills }
      }
    }
  };
}
```

**Acceptance Criteria**:
- AND logic works (must have all)
- OR logic works (has any of)
- NOT logic works (excludes users)
- Complex combinations work

#### 4.4 Add Saved Searches Feature
**File**: `src/server/api/routers/talent.ts`

**Schema**:
```prisma
model SavedSearch {
  id          String   @id @default(cuid())
  userId      String
  name        String
  filters     Json     // Store filter object
  emailAlerts Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

**Endpoints**:
```typescript
talent: createTRPCRouter({
  saveSearch: protectedProcedure
    .input(z.object({
      name: z.string(),
      filters: z.any(),
      emailAlerts: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.savedSearch.create({
        data: {
          userId: ctx.session.user.id,
          ...input
        }
      });
    }),

  getSavedSearches: protectedProcedure
    .query(async ({ ctx }) => {
      return await ctx.db.savedSearch.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { updatedAt: 'desc' }
      });
    }),

  loadSearch: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.savedSearch.findUnique({
        where: {
          id: input.id,
          userId: ctx.session.user.id
        }
      });
    }),
})
```

**Acceptance Criteria**:
- Can save current filters
- Can load saved searches
- Can edit/delete saved searches
- Email alerts toggle works

#### 4.5 Add CSV Export
**File**: `src/app/api/export/talent/route.ts`

**Functionality**:
- Runs search with filters
- Formats as CSV
- Includes all relevant fields
- Downloads with proper filename

**CSV Columns**:
```
Name, Email, Job Title, Company, Location, Skills,
Experience Level, Available for Hiring, GitHub,
LinkedIn, Profile URL
```

**Acceptance Criteria**:
- Exports filtered results
- CSV format correct
- All data included
- Filename descriptive (e.g., "talent-search-2025-01-28.csv")

#### 4.6 Build Email Alert System
**File**: `src/server/services/talentAlerts.ts`

**Functionality**:
1. Cron job runs daily
2. Finds SavedSearches with emailAlerts=true
3. Runs each search
4. Compares to last run
5. Emails new matches

**Email Template**:
```
Subject: New Talent Matches for "{Search Name}"

Hi {User Name},

Your saved talent search "{Search Name}" has {count} new matches:

1. John Doe - Frontend Developer
   Skills: React, TypeScript, Node.js
   [View Profile] [Contact]

2. Jane Smith - Full Stack Engineer
   Skills: Python, Django, PostgreSQL
   [View Profile] [Contact]

[View All Matches] [Manage Alerts] [Unsubscribe]
```

**Acceptance Criteria**:
- Cron job runs reliably
- Only emails new matches (not duplicates)
- Unsubscribe link works
- Professional email design

### Phase 4 Deliverables
- [x] Dedicated /talent page
- [x] Advanced filters working
- [x] Boolean skill logic implemented
- [x] Saved searches feature
- [x] CSV export working
- [x] Email alerts system

### Phase 4 Testing
```bash
# Automated tests
bun run test:integration -- talent
bun run test:e2e -- talent-search

# Manual testing
# 1. Open /talent page
# 2. Apply complex filters (AND/OR/NOT)
# 3. Save search with name
# 4. Enable email alerts
# 5. Export results to CSV
# 6. Verify CSV data accuracy
# 7. Load saved search
# 8. Test email alerts (trigger manually)

# Performance testing
# Test with large datasets (1000+ profiles)
# Verify query time <500ms
```

---

## Database Schema Summary

### New/Modified Models

```prisma
enum SkillCategory {
  FRONTEND
  BACKEND
  BLOCKCHAIN
  DESIGN
  DATA_SCIENCE
  DEVOPS
  MOBILE
  PRODUCT
  MARKETING
  OTHER
}

model UserProfile {
  // ... existing fields

  // NEW fields
  priorExperience String?   @db.Text
  skillsSource    String?   @default("manual")
  skillsSyncedAt  DateTime?
}

model Skills {
  id         String        @id @default(cuid())
  name       String        @unique
  category   SkillCategory @default(OTHER)
  popularity Int           @default(0)
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  userSkills UserSkills[]

  @@index([category])
  @@index([popularity])
  @@index([category, popularity])
}

model UserSkills {
  id              String   @id @default(cuid())
  userId          String
  skillId         String
  experienceLevel Int?     // 1-10 from skill_rating
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  skill Skills @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@unique([userId, skillId])
  @@index([userId])
  @@index([skillId])
  @@index([experienceLevel])
  @@index([userId, experienceLevel])
}

model SavedSearch {
  id          String   @id @default(cuid())
  userId      String
  name        String
  filters     Json
  emailAlerts Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

---

## Scripts Summary

| Script | Purpose | Usage |
|--------|---------|-------|
| `audit-skill-data.ts` | Generate data quality report | `bun run scripts/audit-skill-data.ts` |
| `migrate-skill-ratings.ts` | Sync skill_rating to UserSkills | `bun run scripts/migrate-skill-ratings.ts --execute` |
| `migrate-prior-experience.ts` | Sync prior_experience to profiles | `bun run scripts/migrate-prior-experience.ts --execute` |
| `categorize-skills.ts` | Assign categories to all skills | `bun run scripts/categorize-skills.ts --execute` |
| `normalize-all-skills.ts` | Convert UserProfile.skills to UserSkills | `bun run scripts/normalize-all-skills.ts --execute` |
| `test-search-performance.ts` | Benchmark search queries | `bun run scripts/test-search-performance.ts` |

---

## Testing Strategy

### Unit Tests
```bash
# Skill normalization
bun run test -- skillNormalization.test.ts

# Category inference
bun run test -- categoryInference.test.ts

# Search query building
bun run test -- searchBuilder.test.ts
```

### Integration Tests
```bash
# Application → Profile sync
bun run test:integration -- profile-sync

# Search with various filters
bun run test:integration -- talent-search

# Saved searches CRUD
bun run test:integration -- saved-searches
```

### E2E Tests
```bash
# Complete user journey
bun run test:e2e -- talent-discovery

# Recruiter workflow
bun run test:e2e -- recruiter-flow
```

### Data Migration Tests
```bash
# Test migrations with production data copy
./scripts/test-migrations.sh

# Verify data integrity
bun run scripts/verify-migration.ts
```

---

## Rollback Plan

### If Phase 1 Migration Fails
```bash
# Restore database backup
pg_restore -d ftc_platform backup-before-phase1.sql

# Clear UserSkills created by migration
DELETE FROM UserSkills WHERE createdAt > '2025-01-28';

# Clear priorExperience
UPDATE UserProfile SET priorExperience = NULL;
```

### If Phase 2 Normalization Fails
```bash
# Application form will still work (falls back to old system)
# Profile display shows UserProfile.skills (legacy field preserved)

# To rollback:
DELETE FROM UserSkills WHERE userId IN (
  SELECT id FROM User WHERE createdAt > '2025-01-28'
);
```

### If Phase 3 Search Changes Break
```bash
# Old search endpoint still works
# UI can switch back to legacy filters

# To rollback:
git revert <commit-hash>
npm run deploy
```

---

## Success Metrics

### Data Completeness
- **Baseline**: ~60% of applicants have skills synced
- **Target**: 95%+ of applicants have complete profiles
- **Measure**: `COUNT(userSkills) / COUNT(applications WHERE status='ACCEPTED')`

### Search Quality
- **Baseline**: TBD after Phase 2
- **Target**: Users find matches in <3 searches
- **Measure**: Click-through rate on results

### Engagement
- **Target**: 50+ saved searches created in first month
- **Target**: 200+ CSV exports in first month
- **Measure**: Database counts

### Performance
- **Target**: Search results in <500ms
- **Target**: Page load in <2s
- **Measure**: Performance monitoring tools

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Get approval** to proceed
3. **Create GitHub project** with all tasks
4. **Set up monitoring** (Sentry, performance tracking)
5. **Start Phase 1** - Audit current state

## Questions for Stakeholder Review

1. Is the 2-3 week timeline acceptable?
2. Are there any filters/features missing from Phase 4?
3. Who should have access to /talent page? (admins only? sponsors? everyone?)
4. Should profiles be opt-in for talent search or opt-out?
5. What's the priority: fix data loss first or build search features?

---

**Plan Status**: Ready for Review
**Last Updated**: 2025-01-28
**Estimated Effort**: 60-80 hours
**Risk Level**: Medium
**ROI**: High (enables hiring, recruiting, community building)
