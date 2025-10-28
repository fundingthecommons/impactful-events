# Skills and Experience Data Flow Analysis

## Executive Summary

This analysis reveals a **complex multi-system data architecture for skills** with significant data fragmentation and potential loss of skills data during the application-to-profile synchronization process.

### Key Finding: Data Loss Gap

Skills entered during application submissions via the **`technical_skills`** question are stored in `ApplicationResponse` table but **NOT synchronized** to the `UserSkills`/`UserProfile.skills` systems when users transition from applicant to resident/mentor status. This creates a critical gap where application skills are lost.

---

## 1. Database Schema - Skills Storage Models

### Multiple Skills Storage Systems

#### System 1: UserProfile.skills (Array Field)
- **Model**: `UserProfile`
- **Field**: `skills: String[]` (line 1141)
- **Type**: Simple string array
- **Purpose**: User profile display
- **Status**: Legacy system, being migrated

#### System 2: Normalized Skills System (New)
- **Models**: `Skills` + `UserSkills` (junction table)
- **Schema Lines**: 1379-1412
- **Purpose**: Structured skill catalog with categories and popularity tracking
- **Features**:
  - `Skills.category`: Categorizes skills (Frontend, Backend, Blockchain, etc.)
  - `Skills.popularity`: Tracks usage count
  - `UserSkills.experienceLevel`: Optional 1-10 experience rating
  - Junction table prevents duplicates via unique constraint

#### System 3: Application Response System
- **Model**: `ApplicationResponse`
- **Field**: `answer: String` (line 607)
- **Related**: `ApplicationQuestion` with `questionKey: "technical_skills"`
- **Format**: JSON array (parsed in code)
- **Purpose**: Stores application answers including technical skills

#### System 4: User Profile (Admin Fields)
- **Model**: `User`
- **Field**: `adminWorkExperience: String?` (line 93)
- **Purpose**: Admin-entered LinkedIn work experience copy
- **Note**: Text blob, not structured

#### System 5: Contact.skills
- **Model**: `Contact`
- **Field**: `skills: String[]` (line 360)
- **Purpose**: Sponsor contact skills tracking
- **Status**: Simple string array

---

## 2. Application Form - Skills Input Flow

### Application Questions Configuration

**Location**: `prisma/seed.ts` lines 296-318

#### Question 1: `technical_skills`
```
questionKey: "technical_skills"
questionEn: "What are your technical skills? Please select all that apply."
questionEs: "¿Cuáles son tus habilidades técnicas? Por favor, selecciona todas las que apliquen."
questionType: "MULTISELECT"
required: true
options: ["Designer", "Developer", "Project Manager", "Researcher", "Other"]
order: 17
```

#### Question 2: `technical_skills_other`
```
questionKey: "technical_skills_other"
questionEn: "If you answered 'other' in the previous question, please specify here."
questionEs: "Si respondiste \"otro\" en la pregunta anterior, por favor da más detalle."
questionType: "TEXT"
required: true (conditional)
order: 18
```

#### Question 3: `skill_rating`
```
questionKey: "skill_rating"
questionEn: "On a scale of 1-10, how would you rate the technical skills you chose?"
questionEs: "En una escala del 1 al 10, ¿cómo calificarías las habilidades técnicas?"
questionType: "NUMBER"
required: true
order: 19
```

#### Question 4: `prior_experience`
```
questionKey: "prior_experience"
questionEn: "What is your prior experience with cryptography/currency, decentralized technologies..."
questionEs: "Cuéntanos más sobre tu experiencia en criptografía..."
questionType: "TEXTAREA"
required: true
order: 10
```

### Form Component: DynamicApplicationForm

**Location**: `/src/app/_components/DynamicApplicationForm.tsx`

- **Framework**: Mantine UI
- **State Management**: useState for formValues (line 146)
- **Persistence**: onBlur saving via `updateResponse` mutation
- **Handling**: Stores as ApplicationResponse records
- **Current Status**: Does NOT use SkillsMultiSelect component (reserved for profiles only)

### UI Component: SkillsMultiSelect

**Location**: `/src/app/_components/SkillsMultiSelect.tsx`

- **Purpose**: Allows selecting from normalized skill catalog with creation of new skills
- **Used In**: MentorApplicationForm (line 45)
- **Features**:
  - Fetches skills from `getSkillsByCategory` API
  - Groups skills by category
  - Allows creating new skills inline
  - Returns skill IDs (not names)
  - Stores as array of skill IDs

---

## 3. Migration Scripts - Skills Data Movement

### Script 1: migrate-skills.ts

**Location**: `scripts/migrate-skills.ts`

**Purpose**: Converts UserProfile.skills String[] → normalized Skills + UserSkills

**Functionality**:
1. Reads all UserProfile.skills arrays
2. Normalizes variations (react → React, vue → Vue)
3. Categorizes skills automatically
4. Creates Skills records with popularity counts
5. Creates UserSkills junction records
6. Preserves original UserProfile.skills for backward compatibility

**Status**: One-time migration script, already executed

### Script 2: update-prior-experience.ts

**Location**: `scripts/update-prior-experience.ts`

**Purpose**: Imports prior_experience data from CSV to ApplicationResponse

**Functionality**:
1. Reads CSV file with prior experience text
2. Finds matching applications by email
3. Creates/updates ApplicationResponse for prior_experience question
4. Includes dry-run mode for safety
5. Tracks statistics of updates

**Status**: Used for legacy data imports

---

## 4. Profile Display Implementation

### Profile Router API Endpoints

**Location**: `/src/server/api/routers/profile.ts`

#### Key Endpoint: `getProfile` (lines 101-170)
- **Input**: userId
- **Returns**: UserProfile with basic fields including `skills: String[]`
- **Note**: Returns legacy string array format, NOT normalized UserSkills

#### Endpoint: `searchProfiles` (lines 206-285)
- **Filters**: Supports `skills` array filter (line 234-235)
- **Query**: Uses `hasSome` operator on UserProfile.skills field
- **Status**: Still using legacy string array

#### Endpoint: `getAllMembers` (lines 288-368)
- **Filters**: Similar to searchProfiles
- **Status**: Uses legacy string array format

#### Endpoint: `getProfileCompletion` (lines 557-602)
- **Logic**: Checks if skills field is filled (line 580)
- **Formula**: Counts skills as completion metric
- **Status**: Legacy system check

### Profile Sync System

**Location**: `/src/server/api/routers/profile.ts` lines 656-1374

#### Key Methods:

##### `previewApplicationSync` (lines 696-866)
- **Purpose**: Shows what will sync from application to profile
- **Skills Handling** (lines 756-771):
  ```typescript
  if (responseMap.has("technical_skills")) {
    const appSkills = JSON.parse(responseMap.get("technical_skills")!) as string[];
    const profileSkills = currentProfile?.skills ?? [];
    // Will merge with existing skills
  }
  ```
- **Status**: Shows preview but doesn't execute sync

##### `syncFromApplication` (lines 868-1052)
- **Purpose**: Actual profile sync from application
- **Skills Logic** (lines 928-939):
  ```typescript
  case 'skills':
    if (responseMap.has("technical_skills")) {
      const appSkills = JSON.parse(responseMap.get("technical_skills")!) as string[];
      const existingSkills = profile.skills ?? [];
      const mergedSkills = Array.from(new Set([...existingSkills, ...appSkills]));
      updateData.skills = mergedSkills;
      syncedFields.push('skills');
    }
  ```
- **Limitation**: Updates UserProfile.skills (legacy array), NOT UserSkills table

##### `adminBulkSyncProfiles` (lines 1099-1374)
- **Admin Capability**: Bulk sync applications to profiles
- **Same Limitation**: Uses UserProfile.skills array, not normalized system
- **Dry Run**: Can preview changes without applying

---

## 5. Data Flow Architecture

### Complete Journey: From Application to Profile

```
┌─────────────────────────────────────────────────────────────┐
│ 1. APPLICATION SUBMISSION                                   │
├─────────────────────────────────────────────────────────────┤
│ User fills DynamicApplicationForm                           │
│ • technical_skills (MULTISELECT) → "Designer, Developer"   │
│ • skill_rating (NUMBER) → 7                                 │
│ • prior_experience (TEXTAREA) → description                │
│                                                              │
│ Stored in: ApplicationResponse table                        │
│ • questionKey: "technical_skills"                          │
│ • answer: "[\"Designer\",\"Developer\"]" (JSON string)     │
│ ├─ Schema: String, not parsed/validated                    │
│ ├─ No validation against Skills catalog                    │
│ └─ No skill categorization                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│ 2. APPLICATION STATUS CHANGE                                │
├─────────────────────────────────────────────────────────────┤
│ Admin changes status: DRAFT → SUBMITTED → ACCEPTED          │
│                                                              │
│ Data persisted in: Application table                        │
│ • status: ACCEPTED                                          │
│ • submittedAt: timestamp                                    │
│                                                              │
│ Email notifications sent with application data             │
│ (but skills not displayed in emails - uses responses)      │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│ 3. PROFILE SYNC (OPTIONAL - USER INITIATED)                │
├─────────────────────────────────────────────────────────────┤
│ User navigates to dashboard profile tab                    │
│ • Views preview of syncable data via API                   │
│ • Chooses which fields to sync                             │
│ • Clicks "Sync from Application" button                    │
│                                                              │
│ Data extraction: ApplicationResponse                        │
│ • technical_skills response → parse JSON → string array    │
│                                                              │
│ Storage: UserProfile.skills (LEGACY)                       │
│ • Type: String[] (e.g., ["Designer", "Developer"])         │
│ • No structure, category, or ratings preserved             │
│ • Overwrites or merges with existing profile skills        │
│                                                              │
│ CRITICAL GAP: Not synced to UserSkills (normalized)        │
│ CONSEQUENCE:                                                │
│ ├─ Application context lost (prior_experience skipped)     │
│ ├─ Skill ratings lost (skill_rating not synced)            │
│ ├─ Profile searches use legacy array (inconsistent UX)     │
│ └─ Admin bulk sync has same limitation                     │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│ 4. MENTOR APPLICATION (ALTERNATIVE PATH)                    │
├─────────────────────────────────────────────────────────────┤
│ Mentor uses MentorApplicationForm                          │
│ • Uses SkillsMultiSelect component                         │
│ • Stores skill IDs (not names)                             │
│ • Calls updateUserSkills API                               │
│                                                              │
│ Storage: UserSkills table (NORMALIZED)                     │
│ • skill_id references Skills catalog                       │
│ • experienceLevel stored (1-10)                            │
│ • Duplicates prevented via unique constraint               │
│                                                              │
│ DIFFERENCE FROM RESIDENT PATHWAY                           │
│ ├─ Uses normalized system directly                         │
│ ├─ No ApplicationResponse intermediate step                │
│ └─ Full structured data preserved                          │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│ 5. PROFILE DISPLAY                                          │
├─────────────────────────────────────────────────────────────┤
│ User Profile Page                                           │
│ • getProfile API returns UserProfile                       │
│ • Displays skills: String[] array                          │
│ • Shows simple list (no categories/experience)             │
│                                                              │
│ Search/Directory                                            │
│ • searchProfiles filters by skills                         │
│ • Uses hasSome on string array                             │
│ • No skill category filtering available                    │
│                                                              │
│ INCONSISTENCY:                                             │
│ ├─ Mentor profiles have UserSkills (normalized)            │
│ ├─ Resident profiles have UserProfile.skills (legacy)      │
│ └─ Display/search treats them differently                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Current Gaps and Data Loss Points

### Gap 1: Application Skills → Profile Skills (CRITICAL)

**Problem**: When residents sync from applications, skills are extracted but not properly categorized

**Data Lost**:
- Skill rating/experience level (skill_rating question)
- Application context (prior_experience question)
- Skill categories (not re-established)
- Structured validation

**Code Location**: `/src/server/api/routers/profile.ts` lines 928-939

**Affected Users**: All residents who sync from applications

### Gap 2: Inconsistent Skills Storage Systems

**Problem**: Two parallel, incompatible systems

| Aspect | UserProfile.skills | UserSkills |
|--------|-------------------|-----------|
| Storage | String array | Junction table + Skills catalog |
| Category | None | Yes (Blockchain, Frontend, etc.) |
| Experience Level | None | Optional (1-10) |
| Validation | None | Catalog reference |
| Population | Profile sync, manual entry | Mentor form, migration |
| Display | Simple list | Rich structured data |

**Users Affected**: Everyone with both systems

### Gap 3: Skills in Applications Not Normalized

**Problem**: ApplicationResponse stores skills as JSON strings, not references to Skills catalog

**Issues**:
- Variations not handled (react vs React)
- No popularity tracking
- No category assignment
- Can't enforce consistency across applications

**Code Location**: `prisma/seed.ts` lines 296-301 (question definition)

### Gap 4: Skill Ratings Never Persisted

**Problem**: `skill_rating` question answer is stored in ApplicationResponse but never synced anywhere

**Data Completely Lost**:
- User's self-assessment of technical level
- Valuable for mentor matching
- Not accessible in profile or analytics

**Code Location**: No sync logic for skill_rating field

### Gap 5: Prior Experience Lost in Sync

**Problem**: `prior_experience` question answer not synced to profile

**Data Lost**:
- Contextual experience narrative (text up to 1000+ characters)
- Could be synced to UserProfile.bio but currently isn't
- Only in ApplicationResponse archive

**Code Location**: `/src/server/api/routers/profile.ts` - no case for prior_experience

### Gap 6: Mentor vs Resident Paths Create Inconsistency

**Problem**: Two different question flows with different storage mechanisms

**Resident Path**:
- Uses generic DynamicApplicationForm
- technical_skills as MULTISELECT with predefined options
- Syncs to UserProfile.skills (legacy array)

**Mentor Path**:
- Uses MentorApplicationForm
- Uses SkillsMultiSelect with catalog
- Stores to UserSkills (normalized)
- Includes experience levels

**Result**: Incomparable skills data across user types

---

## 7. Contact Model - Separate Skills System

**Location**: `/Users/james/code/impactful-events/prisma/schema.prisma` lines 345-369

```prisma
model Contact {
  id        String @id @default(cuid())
  firstName String
  lastName  String
  email     String?
  ...
  skills    String[]  // Separate string array for sponsor contacts
  ...
}
```

**Purpose**: Tracks sponsor contact skills separately

**Status**: Isolated system, not integrated with application or profile skills

**Note**: Also uses legacy string array, not normalized Skills catalog

---

## 8. Analytics System - Skills Word Cloud

**Location**: `/src/server/api/routers/analytics.ts`

**Endpoint**: `getSkillsWordCloud`

**Current Implementation**:
```typescript
questionKey: { in: ["technical_skills", "skills", "expertise"] }
// Tries to parse as JSON array (for technical_skills)
// Falls back to string processing
```

**Limitation**: Only processes application responses, not profile skills

**Missing Data**: Doesn't aggregate from UserProfile.skills or UserSkills

---

## 9. Admin Panel - Skills Display

**Location**: `/src/app/admin/events/[eventId]/applications/AdminApplicationsClient.tsx`

**Implementation**:
```typescript
const technicalSkills = getResponseValue(responses, "technical_skills") 
                     || getResponseValue(responses, "skills");
```

**Shows**: Raw JSON array from ApplicationResponse

**Limitations**:
- No formatting or categorization
- Not linked to Skills catalog
- Shows duplicate code (line appears twice)

---

## 10. Summary of All Question Keys Used

| questionKey | Type | Storage | Usage | Status |
|-------------|------|---------|-------|--------|
| technical_skills | MULTISELECT | ApplicationResponse | Resident form | Legacy options |
| technical_skills_other | TEXT | ApplicationResponse | Resident form | Conditional |
| skill_rating | NUMBER | ApplicationResponse | Resident form | Never synced |
| prior_experience | TEXTAREA | ApplicationResponse | Resident form | Never synced |
| (skills in MentorApplicationForm) | MultiSelect via SkillsMultiSelect | UserSkills | Mentor form | Normalized |

---

## Recommendations for Data Flow Improvement

### Short Term (No Migration)
1. Sync skill_rating to UserProfile as a new field
2. Sync prior_experience to UserProfile.bio (optional, append)
3. Update admin panel to format technical_skills array
4. Add analytics aggregation from both UserProfile.skills and UserSkills

### Medium Term (Data Consolidation)
1. Create new ApplicationQuestionResponse table linking to Skills catalog
2. Modify resident application form to use SkillsMultiSelect (like mentors)
3. Update sync logic to populate UserSkills from applications
4. Deprecate UserProfile.skills field

### Long Term (Full Normalization)
1. Migrate all skills to UserSkills system
2. Unify resident and mentor question flows
3. Add skill experience level to resident form
4. Create skill-based matching algorithms leveraging structured data

---

## Files Relevant to Skills Data Flow

- `/prisma/schema.prisma` - Schema definitions (Skills, UserSkills, UserProfile, Contact, Application, ApplicationResponse)
- `/src/server/api/routers/skills.ts` - Skills API (getAvailableSkills, getUserSkills, updateUserSkills, createSkill)
- `/src/server/api/routers/profile.ts` - Profile API (syncFromApplication, previewApplicationSync, adminBulkSyncProfiles)
- `/src/server/api/routers/application.ts` - Application API (updateResponse, getApplication)
- `/src/app/_components/SkillsMultiSelect.tsx` - Skills UI component (mentor form)
- `/src/app/_components/DynamicApplicationForm.tsx` - Application form component (residents)
- `/src/app/_components/MentorApplicationForm.tsx` - Mentor form (uses SkillsMultiSelect)
- `/src/app/admin/events/[eventId]/applications/AdminApplicationsClient.tsx` - Admin display
- `/scripts/migrate-skills.ts` - Skills migration (UserProfile.skills → UserSkills)
- `/scripts/update-prior-experience.ts` - Prior experience import
- `/prisma/seed.ts` - Application question definitions (technical_skills, skill_rating, prior_experience)

