# Migration Scripts vs "Import from Applications" Button - Comparison

## Overview

You asked how the migration scripts compare to the "Import from Applications" button on `/profile/edit`. Here's a detailed breakdown.

---

## Current "Import from Applications" Button

### Location
- **Page**: https://platform.fundingthecommons.io/profile/edit
- **Code**: `src/app/profile/edit/ProfileEditClient.tsx` (line 663, 676)
- **API**: `api.profile.syncFromApplication` (`src/server/api/routers/profile.ts` line 597)

### What It Does

The button allows users to **manually** import data from their application into their profile. Here's what it syncs:

| Field | Source Question Key | Target Field | Notes |
|-------|---------------------|--------------|-------|
| Skills | `technical_skills` | `UserProfile.skills[]` | Merges with existing skills |
| Bio | `bio` | `UserProfile.bio` | Only if profile bio is empty |
| Location | `location` | `UserProfile.location` | Only if empty |
| Company | `company` | `UserProfile.company` | Only if empty |
| LinkedIn | `linkedin_url` | `UserProfile.linkedinUrl` | Only if empty |
| GitHub | `github_url` | `UserProfile.githubUrl` | Only if empty |
| Twitter | `twitter` | `UserProfile.twitterUrl` | Only if empty |
| Telegram | `telegram_handle` | `UserProfile.telegramHandle` | Only if empty |

### What It Does NOT Do

❌ **Missing Data** - These are NOT synced:
- `skill_rating` (1-10 expertise level) → **LOST**
- `prior_experience` (experience descriptions) → **LOST**
- UserSkills records (normalized skills with levels) → **NOT CREATED**
- Experience levels in UserSkills → **NOT SET**

### Code Location

```typescript
// src/server/api/routers/profile.ts lines 928-939
case 'skills':
  if (responseMap.has("technical_skills")) {
    try {
      const appSkills = JSON.parse(responseMap.get("technical_skills")!) as string[];
      const existingSkills = profile.skills ?? [];
      const mergedSkills = Array.from(new Set([...existingSkills, ...appSkills]));
      updateData.skills = mergedSkills;  // ← LEGACY ARRAY ONLY
      syncedFields.push('skills');
    } catch {
      // Skip if parsing fails
    }
  }
  break;
// ❌ No handling for skill_rating or prior_experience!
// ❌ No UserSkills records created!
```

---

## Our Migration Scripts

### What They Do

The migration scripts are **one-time bulk operations** that fix historical data loss for **all users at once**.

#### Migration Script 1: `migrate-skill-ratings.ts`

**Purpose**: Recover the 150 lost skill ratings

| What It Does | How It's Different from Button |
|-------------|--------------------------------|
| Finds ALL users with `skill_rating` responses | Button only works for current user |
| Parses rating (1-10 scale) | Button ignores this data |
| Creates **UserSkills records** with `experienceLevel` | Button only updates legacy `skills[]` array |
| Links to normalized **Skills catalog** | Button uses raw strings |
| Runs once for entire database | Button runs per-user on demand |

**Output**:
- ✅ 146 users get experience levels set (0→146)
- ✅ ~300+ UserSkills records created with ratings
- ✅ Skills.popularity counters updated
- ✅ Enables filtering by expertise level

#### Migration Script 2: `migrate-prior-experience.ts`

**Purpose**: Recover the 124 lost experience descriptions

| What It Does | How It's Different from Button |
|-------------|--------------------------------|
| Finds ALL users with `prior_experience` responses | Button doesn't handle this at all |
| Creates **new field** `UserProfile.priorExperience` | Button doesn't know this field exists |
| Preserves full experience text | Button loses this data entirely |
| Sets metadata (`skillsSource`, `skillsSyncedAt`) | Button doesn't track this |
| Runs once for entire database | Button never accesses this data |

**Output**:
- ✅ 124 users get experience descriptions (0→124)
- ✅ Rich context preserved for talent search
- ✅ Domain expertise searchable
- ✅ Metadata tracked for future updates

---

## Key Differences

### 1. Scope

| Aspect | Import Button | Migration Scripts |
|--------|--------------|-------------------|
| **Who** | Current logged-in user only | All users in database |
| **When** | On-demand (user clicks button) | One-time bulk operation |
| **Trigger** | Manual user action | Admin/developer runs script |
| **Frequency** | Anytime user wants | Once (fixes historical data) |

### 2. Data Coverage

| Data Type | Import Button | Migration Scripts |
|-----------|--------------|-------------------|
| **Skills (names)** | ✅ Yes (legacy array) | ✅ Yes (normalized catalog) |
| **Skill ratings** | ❌ **LOST** | ✅ **RECOVERED** |
| **Prior experience** | ❌ **LOST** | ✅ **RECOVERED** |
| **UserSkills records** | ❌ Not created | ✅ Created |
| **Experience levels** | ❌ Not set | ✅ Set |
| **Skills popularity** | ❌ Not updated | ✅ Updated |

### 3. Data Structure

| Feature | Import Button | Migration Scripts |
|---------|--------------|-------------------|
| **Uses legacy skills array** | ✅ Yes | ⚠️ Yes (backward compat) |
| **Uses normalized Skills** | ❌ No | ✅ Yes |
| **Creates UserSkills** | ❌ No | ✅ Yes |
| **Sets experience levels** | ❌ No | ✅ Yes |
| **Enables category filtering** | ❌ No | ✅ Yes (future) |
| **Enables expertise filtering** | ❌ No | ✅ Yes |

### 4. Use Case

| Scenario | Import Button | Migration Scripts |
|----------|--------------|-------------------|
| **New user sets up profile** | ✅ Perfect | ❌ Not needed |
| **User updates profile from new application** | ✅ Good | ❌ Not needed |
| **Fix historical data loss** | ❌ Too slow (1 user at a time) | ✅ Perfect |
| **Recover skill ratings** | ❌ Can't do this | ✅ Only way |
| **Enable talent search** | ❌ Incomplete data | ✅ Complete data |

---

## Problem: The Import Button is Incomplete

### What Users See

When a user clicks "Import from Applications", they see:

```
✓ Imported skills: Designer, Developer
✓ Imported location: San Francisco
✓ Imported company: Example Corp
```

### What They DON'T See (Data Loss)

```
❌ Skill rating: 8/10 (LOST - button ignores this)
❌ Prior experience: "I've worked in DeFi for 3 years..." (LOST - button ignores this)
❌ Experience levels: Not set in UserSkills (LOST)
```

**Result**: User thinks their data is imported, but critical context is missing!

---

## The Complete Solution

### Phase 1: Fix Historical Data (Migration Scripts)

**Run ONCE to recover lost data for all existing users:**

1. ✅ Schema updated (new `priorExperience` field)
2. Run `migrate-skill-ratings.ts --execute` (146 users)
3. Run `migrate-prior-experience.ts --execute` (124 users)
4. Result: 0% data loss, 100% sync rate

### Phase 2: Fix Import Button (Profile Sync Update)

**Update the button to handle all data going forward:**

Add to `src/server/api/routers/profile.ts` (line ~940):

```typescript
case 'skills':
  if (responseMap.has("technical_skills")) {
    try {
      const appSkills = JSON.parse(responseMap.get("technical_skills")!) as string[];

      // ✅ NEW: Get skill rating if provided
      const skillRating = responseMap.has("skill_rating")
        ? parseInt(responseMap.get("skill_rating")!)
        : undefined;

      // ✅ NEW: Create UserSkills records with experience levels
      await syncSkillsToUserSkills(
        ctx.session.user.id,
        appSkills,
        skillRating,
        ctx.db
      );

      // Keep legacy array for backward compatibility
      const existingSkills = profile.skills ?? [];
      const mergedSkills = Array.from(new Set([...existingSkills, ...appSkills]));
      updateData.skills = mergedSkills;

      syncedFields.push('skills');
    } catch {
      // Skip if parsing fails
    }
  }
  break;

// ✅ NEW: Handle prior experience
case 'priorExperience':
  if (responseMap.has("prior_experience")) {
    const priorExp = responseMap.get("prior_experience")!;
    if (priorExp.trim()) {
      updateData.priorExperience = priorExp.trim();
      updateData.skillsSource = 'application';
      updateData.skillsSyncedAt = new Date();
      syncedFields.push('priorExperience');
    }
  }
  break;
```

### Result: Complete Data Flow

```
Application Form
├─ technical_skills ────────┬─→ UserProfile.skills[] (legacy)
│                           └─→ UserSkills (normalized) ✅
├─ skill_rating ───────────────→ UserSkills.experienceLevel ✅
└─ prior_experience ───────────→ UserProfile.priorExperience ✅

Import Button (updated)
├─ Syncs all fields ✅
├─ Creates UserSkills ✅
└─ Sets experience levels ✅

Search / Display
├─ Can filter by expertise ✅
├─ Can see experience text ✅
└─ Can search by category ✅
```

---

## Summary: Migration Scripts vs Button

### Migration Scripts (One-Time)

**Purpose**: Fix historical data loss for all users

**What it does**:
- ✅ Bulk operation for entire database
- ✅ Recovers 150 lost skill ratings
- ✅ Recovers 124 lost experience descriptions
- ✅ Creates missing UserSkills records
- ✅ Sets experience levels
- ✅ Run once and done

**When to use**: Now (to fix existing data)

### Import Button (Ongoing)

**Purpose**: User self-service profile setup

**What it does (current)**:
- ✅ Imports basic fields (name, location, etc.)
- ✅ Imports skills (legacy array only)
- ❌ Ignores skill ratings
- ❌ Ignores prior experience
- ❌ Doesn't create UserSkills

**What it should do (after Phase 2)**:
- ✅ Everything above
- ✅ Create UserSkills with experience levels
- ✅ Import prior experience
- ✅ Set metadata
- ✅ Full data preservation

**When to use**: Anytime user wants to update profile from application

---

## Recommendation

1. **Run migration scripts NOW** (Phase 1)
   - Fixes historical data for all 146 users
   - Enables talent search immediately
   - One-time operation

2. **Update import button** (Phase 2 - Next)
   - Prevents future data loss
   - Makes button feature-complete
   - Benefits new users going forward

3. **Both are needed**:
   - Scripts fix the past
   - Button update fixes the future
   - Together = 100% data preservation

---

## Action Items

### Immediate (This Session)
- [x] Run `migrate-skill-ratings.ts` dry-run
- [ ] Review dry-run output
- [ ] Execute migrations with `--execute` flag
- [ ] Verify with audit script

### Next Session
- [ ] Update `syncFromApplication` endpoint
- [ ] Add `priorExperience` to sync fields
- [ ] Add `syncSkillsToUserSkills` helper
- [ ] Test import button with new application
- [ ] Deploy updated sync logic

---

**Bottom Line**: The migration scripts do what the Import button **should have been doing all along** - they preserve ALL the data users provide during applications, not just the basic fields. The scripts are a one-time fix for historical data; then we'll update the button to work correctly going forward.
