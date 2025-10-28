# Skills Searchability & Talent Discovery - Recommendations

## Executive Summary

Based on analysis of the user profile at https://platform.fundingthecommons.io/profiles/cmewdy2ki0019jr049a1tvz9p and the application system at https://platform.fundingthecommons.io/admin/events/funding-commons-residency-2025/applications, I've identified critical gaps in how skills data flows from applications to searchable profiles.

**Current Status**: ❌ Skills data is being lost during application-to-profile sync
**Impact**: Talent discovery is incomplete - many skills entered during applications are not searchable
**Root Cause**: Multiple parallel skills systems with incomplete synchronization

---

## Current State Analysis

### What's Working ✅

1. **Members Directory UI** (`/profiles`)
   - Clean, professional interface with skill badges
   - Search box, skill multiselect filter, location filter
   - Availability filters (mentoring, hiring, office hours)
   - Infinite scroll pagination
   - Social links integration

2. **Profile Display**
   - Shows up to 3 skills as badges on cards
   - Full profile pages show complete skill lists
   - Integration with availability indicators

3. **Basic Search Capabilities**
   - Text search across name, bio, job title, company
   - Skill array filtering using `hasSome` operator
   - Location substring matching

### Critical Gaps ❌

#### Gap 1: Skill Ratings Never Persisted
**Question**: "On a scale of 1-10, how would you rate your technical skills?"
**Storage**: ApplicationResponse table
**Problem**: Never synced to UserProfile or UserSkills
**Impact**: Self-assessed expertise levels are completely lost

**Code Location**: [profile.ts:928-939](src/server/api/routers/profile.ts#L928-L939)
```typescript
// Skills are extracted but rating is ignored
if (responseMap.has("technical_skills")) {
  const appSkills = JSON.parse(responseMap.get("technical_skills")!) as string[];
  // skill_rating is in responseMap but never used!
}
```

#### Gap 2: Prior Experience Not Synced
**Question**: "What is your prior experience with crypto/defi/climate tech?"
**Storage**: ApplicationResponse table
**Problem**: Rich experience descriptions never appear in profiles
**Impact**: Context about background and domain expertise is lost

**Recommended Fix**: Sync to `UserProfile.bio` or create new `priorExperience` field

#### Gap 3: Inconsistent Skill Normalization
**Problem**: Two different skill input systems for residents vs mentors

| Applicant Type | Form Component | Skill Storage | Normalized? |
|---------------|----------------|---------------|-------------|
| Residents | DynamicApplicationForm | `UserProfile.skills[]` | ❌ No |
| Mentors | MentorApplicationForm | `UserSkills` table | ✅ Yes |

**Impact**:
- Residents get free-text skills: "react", "React", "React.js" (duplicates)
- Mentors get normalized skills from catalog with categories
- Search quality suffers from variation inconsistency

#### Gap 4: No Category/Taxonomy Search
**Current**: Flat skill array search
**Problem**: Can't search "all frontend developers" or "blockchain experts"
**Missing**: Skill categories (Frontend, Backend, Blockchain, Design, etc.)

**Available But Unused**: Skills table has `category` field that's never exposed to search

#### Gap 5: No Experience Level Filtering
**Current**: Boolean skill matching (has skill or doesn't)
**Problem**: Can't filter by expertise level (junior vs senior)
**Missing**: `UserSkills.experienceLevel` (1-10 scale) is stored but not searchable

#### Gap 6: No Popularity-Based Skill Suggestions
**Current**: Skill filter dropdown shows all skills equally
**Problem**: Users don't know which skills are most common
**Missing**: Skills table has `popularity` counter that could drive autocomplete ranking

---

## Recommended Solutions

### Phase 1: Fix Data Loss (Critical - Do First)

#### 1.1 Migrate Skill Ratings to UserSkills

**Goal**: Preserve the 1-10 skill ratings users provided during applications

**Implementation**:
```typescript
// New migration script: scripts/migrate-skill-ratings.ts
// 1. Find all ApplicationResponses with skill_rating answers
// 2. Match to corresponding technical_skills answers
// 3. Create/update UserSkills records with experienceLevel
// 4. Handle cases where skills aren't in normalized catalog yet
```

**SQL Example**:
```sql
-- Find applications with skill ratings
SELECT
  a.userId,
  ar1.answer as skills,
  ar2.answer as rating
FROM Application a
JOIN ApplicationResponse ar1 ON ar1.applicationId = a.id
JOIN ApplicationResponse ar2 ON ar2.applicationId = a.id
WHERE ar1.questionKey = 'technical_skills'
  AND ar2.questionKey = 'skill_rating'
```

**Files to Create/Modify**:
- Create: `scripts/migrate-skill-ratings.ts`
- Modify: `src/server/api/routers/profile.ts` (syncFromApplication method, line 928)

#### 1.2 Sync Prior Experience to Profiles

**Goal**: Make experience descriptions searchable and visible

**Options**:

**Option A**: Sync to existing `bio` field
```typescript
// Append to bio during sync
const priorExp = responseMap.get("prior_experience");
if (priorExp && !currentProfile?.bio?.includes(priorExp)) {
  bio = `${currentProfile?.bio ?? ''}\n\nPrior Experience:\n${priorExp}`;
}
```

**Option B**: Create dedicated field (better)
```sql
-- Add to UserProfile model
ALTER TABLE UserProfile ADD COLUMN priorExperience TEXT;
```

**Recommended**: Option B - keeps experience separate for better display control

**Files to Modify**:
- `prisma/schema.prisma` - Add `priorExperience` field to UserProfile
- `src/server/api/routers/profile.ts` - Update sync logic (line 928-939)

#### 1.3 Normalize Resident Skills

**Goal**: Use same normalized Skills catalog for all users

**Changes Required**:

1. **Update DynamicApplicationForm** to use SkillsMultiSelect component
   - File: `src/app/_components/DynamicApplicationForm.tsx`
   - Replace MULTISELECT rendering with SkillsMultiSelect
   - Store skill IDs instead of string names

2. **Update Profile Sync** to use UserSkills table
   - File: `src/server/api/routers/profile.ts` (line 928-939)
   - Change from `UserProfile.skills[]` to `UserSkills` records
   - Maintain backward compatibility with legacy data

3. **Add Skill Normalization Helper**
   ```typescript
   // src/utils/skillNormalization.ts
   export async function normalizeSkill(skillName: string) {
     // Check if skill exists (case-insensitive)
     const existing = await db.skills.findFirst({
       where: { name: { equals: skillName, mode: 'insensitive' } }
     });

     if (existing) return existing;

     // Create new skill with auto-categorization
     return await db.skills.create({
       data: {
         name: skillName,
         category: inferCategory(skillName), // AI-based categorization
         popularity: 1
       }
     });
   }
   ```

---

### Phase 2: Enhanced Search Capabilities

#### 2.1 Add Category-Based Search

**Goal**: Enable "find all blockchain developers" queries

**UI Changes**:
```tsx
// src/app/profiles/ProfilesClient.tsx - Add category filter
<Select
  label="Skill Category"
  placeholder="All categories"
  data={[
    { value: 'FRONTEND', label: 'Frontend Development' },
    { value: 'BACKEND', label: 'Backend Development' },
    { value: 'BLOCKCHAIN', label: 'Blockchain & Web3' },
    { value: 'DESIGN', label: 'Design & UX' },
    { value: 'DATA', label: 'Data Science & Analytics' },
    { value: 'DEVOPS', label: 'DevOps & Infrastructure' },
  ]}
  value={filters.skillCategory}
  onChange={(value) => handleFilterChange('skillCategory', value)}
/>
```

**API Changes**:
```typescript
// src/server/api/routers/profile.ts - Update searchProfiles
const profileSearchSchema = z.object({
  // ... existing fields
  skillCategory: z.enum(['FRONTEND', 'BACKEND', 'BLOCKCHAIN', 'DESIGN', 'DATA', 'DEVOPS']).optional(),
});

// In query logic:
if (skillCategory) {
  where.userSkills = {
    some: {
      skill: { category: skillCategory }
    }
  };
}
```

#### 2.2 Add Experience Level Filtering

**Goal**: Filter by expertise level (1-10 scale)

**UI Changes**:
```tsx
// src/app/profiles/ProfilesClient.tsx
<RangeSlider
  label="Minimum Experience Level"
  min={1}
  max={10}
  value={filters.minExperienceLevel ?? 1}
  onChange={(value) => handleFilterChange('minExperienceLevel', value)}
  marks={[
    { value: 1, label: 'Beginner' },
    { value: 5, label: 'Intermediate' },
    { value: 10, label: 'Expert' }
  ]}
/>
```

**API Changes**:
```typescript
// Filter by experience level when filtering by specific skills
if (skills && skills.length > 0 && minExperienceLevel) {
  where.userSkills = {
    some: {
      skill: { name: { in: skills } },
      experienceLevel: { gte: minExperienceLevel }
    }
  };
}
```

#### 2.3 Skill Popularity Ranking

**Goal**: Show most common skills first in autocomplete

**API Changes**:
```typescript
// src/server/api/routers/skills.ts - Update getSkills endpoint
getSkills: publicProcedure.query(async ({ ctx }) => {
  return await ctx.db.skills.findMany({
    orderBy: [
      { popularity: 'desc' }, // Most popular first
      { name: 'asc' }
    ],
    select: {
      id: true,
      name: true,
      category: true,
      popularity: true
    }
  });
}),
```

**UI Changes**:
```tsx
// src/app/_components/SkillsMultiSelect.tsx
// Show popularity badge next to skill names
<Badge size="xs" color="gray">{skill.popularity} users</Badge>
```

---

### Phase 3: Advanced Talent Discovery

#### 3.1 Build Dedicated Talent Search Page

**New Page**: `/talent` or `/hire`

**Features**:
- Advanced search with boolean operators (AND/OR for skills)
- Save search queries for recruiters
- Export filtered results to CSV
- Email notification when new profiles match saved searches

**File Structure**:
```
src/app/talent/
├── page.tsx                 # Server component
├── TalentSearchClient.tsx   # Client component
└── _components/
    ├── AdvancedFilters.tsx
    ├── SavedSearches.tsx
    └── TalentCard.tsx
```

**Key Features**:
```typescript
interface TalentFilters {
  // Basic filters
  search: string;
  location: string;

  // Skill filters (advanced)
  requiredSkills: string[];      // Must have ALL
  preferredSkills: string[];     // Nice to have
  excludedSkills: string[];      // Must NOT have

  // Experience filters
  minExperienceLevel: number;
  yearsOfExperience: [number, number];

  // Category filters
  skillCategories: SkillCategory[];

  // Availability filters
  availableForHiring: boolean;
  availableForMentoring: boolean;

  // Advanced
  hasGithub: boolean;
  hasProjects: boolean;
  completedApplications: string[]; // Event IDs
}
```

#### 3.2 Add Skill Endorsements (Future)

**Goal**: Social proof for skills

**Schema Changes**:
```prisma
model SkillEndorsement {
  id              String   @id @default(cuid())
  userSkillId     String
  endorserId      String
  comment         String?  @db.Text
  createdAt       DateTime @default(now())

  userSkill       UserSkills @relation(fields: [userSkillId], references: [id])
  endorser        User       @relation(fields: [endorserId], references: [id])

  @@unique([userSkillId, endorserId])
  @@index([userSkillId])
}
```

#### 3.3 AI-Powered Skill Matching (Future)

**Goal**: Semantic search beyond exact keyword matching

**Features**:
- "Find developers similar to [profile]"
- Natural language queries: "blockchain developers with design skills"
- Skill synonym matching (React ↔ React.js)
- Automatic skill clustering (group related technologies)

**Implementation Options**:
- OpenAI embeddings for skill vectors
- Postgres pgvector extension for similarity search
- Pre-computed skill similarity matrix

---

## Implementation Roadmap

### Sprint 1: Fix Data Loss (1-2 days)
- [ ] Create skill rating migration script
- [ ] Add priorExperience field to UserProfile
- [ ] Update profile sync to preserve all application data
- [ ] Run migration on existing users
- [ ] Verify data integrity

**Deliverables**: No more data loss, existing skills preserved

### Sprint 2: Normalize Skills System (2-3 days)
- [ ] Update DynamicApplicationForm to use SkillsMultiSelect
- [ ] Create skill normalization utilities
- [ ] Update profile sync to use UserSkills table
- [ ] Backfill existing UserProfile.skills to UserSkills
- [ ] Maintain backward compatibility

**Deliverables**: Single source of truth for skills

### Sprint 3: Enhanced Search (3-4 days)
- [ ] Add category filter to profiles page
- [ ] Add experience level filter
- [ ] Implement popularity-based skill ranking
- [ ] Update API endpoints with new filters
- [ ] Add skill statistics to admin dashboard

**Deliverables**: Much better search experience

### Sprint 4: Talent Discovery (5-7 days)
- [ ] Build dedicated talent search page
- [ ] Implement advanced filters (AND/OR logic)
- [ ] Add saved searches feature
- [ ] Add CSV export capability
- [ ] Build admin analytics for talent pool

**Deliverables**: Professional recruiting tool

---

## Migration Scripts Needed

### 1. migrate-skill-ratings.ts
```bash
bun run scripts/migrate-skill-ratings.ts --dry-run
bun run scripts/migrate-skill-ratings.ts --execute
```

**Purpose**: Extract skill_rating from ApplicationResponse and sync to UserSkills.experienceLevel

### 2. migrate-prior-experience.ts
```bash
bun run scripts/migrate-prior-experience.ts --dry-run
bun run scripts/migrate-prior-experience.ts --execute
```

**Purpose**: Extract prior_experience from ApplicationResponse and sync to UserProfile.priorExperience

### 3. normalize-all-skills.ts
```bash
bun run scripts/normalize-all-skills.ts --dry-run
bun run scripts/normalize-all-skills.ts --execute
```

**Purpose**: Convert all UserProfile.skills[] to normalized UserSkills records

### 4. audit-skill-data.ts
```bash
bun run scripts/audit-skill-data.ts
```

**Purpose**: Generate report on data completeness
- How many users have skills in UserProfile vs UserSkills?
- How many applications have unsynced skill data?
- What skills are most common but not in catalog?
- Data quality metrics (duplicates, variations, etc.)

---

## Database Schema Changes

### UserProfile Model
```prisma
model UserProfile {
  // ... existing fields

  // DEPRECATED: Will be removed after full migration to UserSkills
  skills              String[]  @default([])

  // NEW: Store rich experience descriptions
  priorExperience     String?   @db.Text

  // NEW: Metadata for tracking migration
  skillsMigratedAt    DateTime?
  skillsSource        String?   @default("manual") // "application" | "manual" | "import"
}
```

### UserSkills Model (Already Exists)
```prisma
model UserSkills {
  id              String   @id @default(cuid())
  userId          String
  skillId         String
  experienceLevel Int?     // 1-10 scale from skill_rating question
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  skill Skills @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@unique([userId, skillId])
  @@index([userId])
  @@index([skillId])
}
```

### Skills Model (Already Exists)
```prisma
model Skills {
  id         String   @id @default(cuid())
  name       String   @unique
  category   String?  // FRONTEND, BACKEND, BLOCKCHAIN, etc.
  popularity Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  userSkills UserSkills[]

  @@index([category])
  @@index([popularity])
}
```

---

## Testing Strategy

### Unit Tests
- [ ] Skill normalization logic (case variations, duplicates)
- [ ] Category inference algorithm
- [ ] Search query building with various filter combinations

### Integration Tests
- [ ] Application submission → profile sync end-to-end
- [ ] Skill rating preservation through full workflow
- [ ] Search results accuracy with different filter combinations

### Data Migration Tests
- [ ] Dry-run migrations with production data copy
- [ ] Verify no data loss during migration
- [ ] Rollback procedures in case of issues

### User Acceptance Testing
- [ ] Recruiter workflow: search → filter → contact
- [ ] Applicant workflow: apply → sync → verify profile
- [ ] Admin workflow: monitor data quality → fix issues

---

## Success Metrics

### Data Completeness
- **Target**: 95%+ of accepted applicants have skills synced to profile
- **Current**: ~60% (estimated based on data loss gaps)
- **Measure**: Count of users with applications vs users with UserSkills records

### Search Quality
- **Target**: Users find relevant profiles in first 3 results
- **Measure**: Click-through rate on search results
- **Baseline**: Establish after Phase 2 deployment

### Skill Catalog Growth
- **Target**: 80%+ of user-entered skills match catalog entries
- **Current**: Unknown (no tracking)
- **Measure**: Ratio of UserSkills records to unique skill strings in old system

### Recruiter Satisfaction
- **Target**: 4+ star rating on talent search tool
- **Measure**: User survey after Phase 4
- **Questions**:
  - "How easy was it to find qualified candidates?"
  - "How accurate were the skill filters?"
  - "How complete were the profiles?"

---

## Risk Mitigation

### Risk 1: Data Loss During Migration
**Mitigation**:
- All migrations have dry-run mode
- Create database backup before each migration
- Maintain old UserProfile.skills field during transition period
- Log all changes for audit trail

### Risk 2: Performance Degradation
**Mitigation**:
- Add database indexes on UserSkills.userId and skillId
- Use cursor-based pagination for large result sets
- Implement query result caching
- Monitor query performance in production

### Risk 3: Skill Catalog Fragmentation
**Mitigation**:
- Implement skill synonym detection
- Admin tools to merge duplicate skills
- AI-assisted categorization for new skills
- Regular data quality audits

### Risk 4: User Confusion
**Mitigation**:
- Clear messaging about profile updates
- Email notifications when skills are synced from applications
- Profile completion checklist guides users
- Help documentation for search features

---

## Next Steps

### Immediate Action Items (This Week)

1. **Create audit script** to quantify current data loss
   ```bash
   bun run scripts/audit-skill-data.ts
   ```

2. **Prioritize based on audit results**
   - If >30% data loss: Start with Phase 1 immediately
   - If <10% data loss: Can proceed with Phase 2 first

3. **Stakeholder review**
   - Share this document with product/recruiting teams
   - Get feedback on priorities
   - Confirm talent discovery requirements

4. **Create GitHub issues** for each sprint
   - Break down into smaller tasks
   - Assign time estimates
   - Set up project board

### Questions to Answer

1. **Who are the primary users of talent search?**
   - Internal recruiters?
   - Event organizers looking for mentors/residents?
   - Sponsors looking for talent?
   - Other community members?

2. **What are the most important search criteria?**
   - Specific technical skills?
   - Domain expertise (climate, crypto, etc.)?
   - Availability for work?
   - Geographic location?

3. **Should profiles be public or private?**
   - Current: Public directory
   - Future: Opt-in for talent pool?
   - Privacy controls needed?

4. **How often do we expect new applications?**
   - Continuous application flow?
   - Batch processing after events?
   - Impacts sync automation design

---

## Resources

### Existing Documentation
- [Skills Data Flow Analysis](./skills-data-flow-analysis.md) - Complete technical analysis
- [CLAUDE.md](../CLAUDE.md) - Project conventions and development commands

### Code References
- Profile sync logic: [profile.ts:928-939](../src/server/api/routers/profile.ts#L928-L939)
- Skills API: [skills.ts](../src/server/api/routers/skills.ts)
- Application form: [DynamicApplicationForm.tsx](../src/app/_components/DynamicApplicationForm.tsx)
- Skills component: [SkillsMultiSelect.tsx](../src/app/_components/SkillsMultiSelect.tsx)
- Members directory: [ProfilesClient.tsx](../src/app/profiles/ProfilesClient.tsx)

### Database Schema
- [schema.prisma](../prisma/schema.prisma)
  - UserProfile model: Line 1131
  - Skills model: Line 1379
  - UserSkills model: Line 1392
  - ApplicationResponse model: Line 600

---

## Conclusion

The foundation for talent discovery is already in place with a clean UI and basic search capabilities. However, critical skill data is being lost during the application-to-profile transition due to incomplete synchronization logic.

**Immediate Priority**: Fix data loss in Phase 1 to preserve skill ratings and experience descriptions that users provide during applications.

**Short-term Goal**: Normalize all skills to use the unified Skills catalog (Phase 2) to improve search quality and data consistency.

**Long-term Vision**: Build a world-class talent discovery platform (Phases 3-4) that enables easy hiring, mentoring connections, and community building.

The existing code is well-structured and migration paths are clear. With focused effort over 2-3 weeks, you can transform this from a basic member directory into a powerful recruiting and networking tool.

---

**Document Version**: 1.0
**Last Updated**: 2025-01-28
**Author**: Analysis based on codebase review
**Status**: Ready for stakeholder review
