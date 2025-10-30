# Talent Search Implementation Plan

## Overview

Add advanced talent search functionality to the event participants page to help recruiters, organizers, and collaborators find residents/participants by their skills, experience levels, and backgrounds.

**Target Page**: `/events/funding-commons-residency-2025` (Participants tab)
**URL**: https://platform.fundingthecommons.io/events/funding-commons-residency-2025

---

## Data Architecture Summary

### Where the Data Lives

#### 1. **Skills with Experience Levels** (✅ Migrated)
- **Table**: `UserSkills` (junction table)
- **Fields**:
  - `userId` - Links to User
  - `skillId` - Links to Skills catalog
  - `experienceLevel` - Integer 1-10 (from application skill ratings)
- **Relation**: `Skills` table has `name`, `category`, `popularity`

#### 2. **Prior Experience Text** (✅ Migrated)
- **Table**: `UserProfile`
- **Field**: `priorExperience` (Text) - Rich experience descriptions from applications
- **Also Available**: `bio`, `jobTitle`, `company`, `yearsOfExperience`

#### 3. **Legacy Skills** (⚠️ Phase out)
- **Table**: `UserProfile`
- **Field**: `skills` (String array) - Old unstructured skills
- **Status**: Being replaced by normalized UserSkills

#### 4. **Availability Flags**
- **Table**: `UserProfile`
- **Fields**: `availableForHiring`, `availableForMentoring`, `availableForOfficeHours`

---

## Proposed Search Interface

### Location: Participants Tab
Add search/filter interface **above** the participant grid on the event detail page.

### Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Event Participants                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  🔍 Find Participants                                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Search by name, skills, or experience...                  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Filter by Skills:                                               │
│  [Frontend ▼] [Backend ▼] [Blockchain ▼] [Design ▼] [+ More]   │
│                                                                   │
│  Experience Level: [Beginner ────●─── Expert]                   │
│                                                                   │
│  Availability: [ ] Hiring  [ ] Mentoring  [ ] Office Hours      │
│                                                                   │
│  [Clear Filters]              Showing 37 of 146 participants     │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  [Participant Cards Grid...]                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Search & Filter Features

### 1. **Text Search** (Primary Input)
- **Search fields**:
  - User name
  - Job title / Company
  - Skill names (from UserSkills)
  - Prior experience text (full-text search)
  - Bio
- **Implementation**: Use PostgreSQL `ILIKE` or full-text search on concatenated fields

### 2. **Skill Category Filters** (Multi-select Chips)
- **Categories** (from Skills.category):
  - Frontend
  - Backend
  - Blockchain
  - Design
  - Data Science
  - Project Management
  - Research
  - Other
- **Behavior**:
  - Select multiple categories (OR logic)
  - Shows only participants with skills in selected categories
- **UI**: Mantine `Chip.Group` with `multiple` mode

### 3. **Experience Level Slider** (Range)
- **Control**: Mantine `RangeSlider` (1-10 scale)
- **Default**: Show all (1-10)
- **Filter Logic**: Show participants whose **maximum skill experience level** falls within range
- **Example**:
  - Slider at 7-10 → Shows experts
  - Slider at 1-4 → Shows beginners/learners

### 4. **Availability Toggles** (Checkboxes)
- [ ] **Available for Hiring**
- [ ] **Available as Mentor**
- [ ] **Available for Office Hours**
- **Behavior**: Multiple selections use OR logic

### 5. **Specific Skills Multi-Select** (Dropdown)
- **Component**: Mantine `MultiSelect` with search
- **Options**: All skills from Skills catalog (sorted by popularity)
- **Filter Logic**: Show participants who have **any** of the selected skills (OR logic)
- **UI Features**:
  - Search/autocomplete
  - Show skill popularity counts
  - Recent/popular skills at top

---

## Enhanced Participant Cards

### Add to Existing Cards

Current cards show:
- Name, avatar
- Job title / company
- Location
- Bio (truncated)
- Social links

**Add**:
1. **Top Skills Badge Row**
   ```tsx
   <Group gap="xs">
     {participant.topSkills.slice(0, 5).map(skill => (
       <Badge
         key={skill.id}
         size="sm"
         variant="light"
         rightSection={<Text size="xs">{skill.level}/10</Text>}
       >
         {skill.name}
       </Badge>
     ))}
   </Group>
   ```

2. **Experience Level Indicator** (for filtered searches)
   - Only show when experience level filter is active
   - Display: "Expert Level: 9/10 in React"

3. **Prior Experience Snippet** (expandable)
   ```tsx
   {participant.priorExperience && (
     <Text size="sm" lineClamp={2} c="dimmed">
       {participant.priorExperience}
     </Text>
   )}
   ```

4. **Availability Badges**
   ```tsx
   <Group gap="xs">
     {participant.availableForHiring && (
       <Badge color="green" size="xs">Available for Hiring</Badge>
     )}
     {participant.availableForMentoring && (
       <Badge color="blue" size="xs">Mentoring</Badge>
     )}
   </Group>
   ```

---

## Technical Implementation

### Phase 1: Backend API (tRPC Endpoint)

#### New Procedure: `event.searchParticipants`

**Location**: `src/server/api/routers/event.ts`

**Input Schema**:
```typescript
{
  eventId: string;
  searchText?: string;           // General search
  skillCategories?: string[];     // ["Frontend", "Blockchain"]
  specificSkills?: string[];      // Skill IDs
  experienceRange?: [number, number]; // [min, max] (1-10)
  availableForHiring?: boolean;
  availableForMentoring?: boolean;
  availableForOfficeHours?: boolean;
  limit?: number;                 // Pagination
  offset?: number;
}
```

**Query Strategy**:
```typescript
const participants = await ctx.db.application.findMany({
  where: {
    eventId: input.eventId,
    status: 'ACCEPTED',
    AND: [
      // Text search (if provided)
      input.searchText ? {
        OR: [
          { user: { name: { contains: input.searchText, mode: 'insensitive' } } },
          { user: { profile: { jobTitle: { contains: input.searchText, mode: 'insensitive' } } } },
          { user: { profile: { bio: { contains: input.searchText, mode: 'insensitive' } } } },
          { user: { profile: { priorExperience: { contains: input.searchText, mode: 'insensitive' } } } },
          // Skill names search
          { user: { userSkills: { some: {
            skill: { name: { contains: input.searchText, mode: 'insensitive' } }
          } } } },
        ]
      } : {},

      // Skill category filter
      input.skillCategories?.length ? {
        user: {
          userSkills: {
            some: {
              skill: {
                category: { in: input.skillCategories }
              }
            }
          }
        }
      } : {},

      // Specific skills filter
      input.specificSkills?.length ? {
        user: {
          userSkills: {
            some: {
              skillId: { in: input.specificSkills }
            }
          }
        }
      } : {},

      // Experience level filter
      input.experienceRange ? {
        user: {
          userSkills: {
            some: {
              experienceLevel: {
                gte: input.experienceRange[0],
                lte: input.experienceRange[1]
              }
            }
          }
        }
      } : {},

      // Availability filters (OR logic if multiple)
      {
        OR: [
          !input.availableForHiring && !input.availableForMentoring && !input.availableForOfficeHours ? {} : undefined,
          input.availableForHiring ? { user: { profile: { availableForHiring: true } } } : undefined,
          input.availableForMentoring ? { user: { profile: { availableForMentoring: true } } } : undefined,
          input.availableForOfficeHours ? { user: { profile: { availableForOfficeHours: true } } } : undefined,
        ].filter(Boolean)
      }
    ]
  },
  include: {
    user: {
      include: {
        profile: true,
        userSkills: {
          include: { skill: true },
          orderBy: { experienceLevel: 'desc' },
          take: 10  // Top 10 skills per user
        }
      }
    }
  },
  take: input.limit ?? 50,
  skip: input.offset ?? 0
});
```

**Return Format**:
```typescript
{
  participants: Array<{
    id: string;
    user: {
      name: string;
      image: string;
      profile: {
        jobTitle: string;
        company: string;
        location: string;
        bio: string;
        priorExperience: string;
        availableForHiring: boolean;
        availableForMentoring: boolean;
        availableForOfficeHours: boolean;
      };
      topSkills: Array<{
        id: string;
        name: string;
        category: string;
        experienceLevel: number;
      }>;
    };
  }>;
  totalCount: number;
  filteredCount: number;
}
```

---

### Phase 2: Frontend Components

#### Component Structure

```
EventDetailClient.tsx (existing)
  └─ Tabs.Panel value="participants"
      ├─ ParticipantSearchFilters.tsx (NEW)
      │   ├─ TextInput (search)
      │   ├─ Chip.Group (categories)
      │   ├─ MultiSelect (specific skills)
      │   ├─ RangeSlider (experience level)
      │   └─ Checkboxes (availability)
      │
      └─ ParticipantGrid.tsx (ENHANCED)
          └─ ParticipantCard.tsx (ENHANCED)
              ├─ Existing fields
              ├─ Skills badges (NEW)
              ├─ Experience level (NEW)
              ├─ Prior experience snippet (NEW)
              └─ Availability badges (NEW)
```

#### New Component: `ParticipantSearchFilters.tsx`

**Location**: `src/app/events/[eventId]/_components/ParticipantSearchFilters.tsx`

**Props**:
```typescript
interface ParticipantSearchFiltersProps {
  onFiltersChange: (filters: SearchFilters) => void;
  totalCount: number;
  filteredCount: number;
}
```

**Features**:
- Debounced text search (300ms)
- State management for all filters
- "Clear Filters" button
- Active filter count badge
- Results count display

---

### Phase 3: UI/UX Enhancements

#### 1. **Collapsible Filters** (Mobile-friendly)
- Desktop: Always expanded
- Mobile: Collapsible accordion with filter count badge

#### 2. **Filter Persistence**
- Store filters in URL query params
- Enable shareable filtered searches
- Example: `?skills=react,solidity&exp=7-10&hiring=true`

#### 3. **Sort Options**
Add dropdown above grid:
- Relevance (default for searches)
- Alphabetical (A-Z)
- Experience Level (High to Low)
- Recently Added

#### 4. **Empty States**
- No participants match filters → Show clear message + "Clear Filters" button
- No search results → Suggest broadening criteria

#### 5. **Loading States**
- Skeleton cards during search
- Search debounce indicator

---

## Implementation Phases

### Phase 1: Core Search (Priority 1) ✅
**Goal**: Basic functional search

- [ ] Create `event.searchParticipants` tRPC endpoint
- [ ] Add text search across name, title, skills, experience
- [ ] Build `ParticipantSearchFilters` component with text input only
- [ ] Update `EventDetailClient` to use search API
- [ ] Test with existing data

**Estimated Time**: 4-6 hours

---

### Phase 2: Skill Filters (Priority 1) ✅
**Goal**: Filter by skills and categories

- [ ] Add skill category chip filters
- [ ] Add specific skills multi-select
- [ ] Enhance participant cards to show top 5 skills with levels
- [ ] Add skill badges with experience level indicators
- [ ] Test filtering combinations

**Estimated Time**: 4-5 hours

---

### Phase 3: Experience & Availability (Priority 2) ✅
**Goal**: Advanced filtering options

- [ ] Add experience level range slider
- [ ] Add availability checkboxes
- [ ] Add availability badges to participant cards
- [ ] Add prior experience snippet (expandable) to cards
- [ ] Implement "Clear Filters" functionality

**Estimated Time**: 3-4 hours

---

### Phase 4: Polish & UX (Priority 2) ✅
**Goal**: Production-ready experience

- [ ] Add URL query param persistence
- [ ] Implement sort options
- [ ] Add empty states and loading states
- [ ] Mobile responsive design (collapsible filters)
- [ ] Add filter count badges
- [ ] Performance optimization (debouncing, memoization)

**Estimated Time**: 4-5 hours

---

### Phase 5: Analytics & Feedback (Priority 3) ⏳
**Goal**: Track usage and improve

- [ ] Add analytics tracking for search usage
- [ ] Add "Export to CSV" for filtered results (admin only)
- [ ] Add "Contact" or "Connect" buttons on cards
- [ ] Implement participant profile modal/page
- [ ] A/B test different filter layouts

**Estimated Time**: 4-6 hours

---

## Database Indexes (Performance)

Add these indexes for fast searching:

```sql
-- Already exists
CREATE INDEX idx_userprofile_availableForHiring ON UserProfile(availableForHiring);
CREATE INDEX idx_userprofile_availableForMentoring ON UserProfile(availableForMentoring);
CREATE INDEX idx_userprofile_availableForOfficeHours ON UserProfile(availableForOfficeHours);

-- Already exists
CREATE INDEX idx_userskills_userid ON UserSkills(userId);
CREATE INDEX idx_userskills_skillid ON UserSkills(skillId);
CREATE INDEX idx_userskills_experiencelevel ON UserSkills(experienceLevel);

-- Already exists
CREATE INDEX idx_skills_category ON Skills(category);
CREATE INDEX idx_skills_name ON Skills(name);

-- NEW: Full-text search indexes
CREATE INDEX idx_userprofile_priorexperience_gin ON UserProfile USING gin(to_tsvector('english', priorExperience));
CREATE INDEX idx_userprofile_bio_gin ON UserProfile USING gin(to_tsvector('english', bio));
```

---

## Example Search Scenarios

### Scenario 1: Find Solidity Experts for Hiring
1. **Text Search**: "solidity"
2. **Experience Range**: 7-10
3. **Availability**: ✓ Available for Hiring
4. **Result**: 5 participants with Solidity experience (7-10/10)

### Scenario 2: Find Frontend Mentors
1. **Skill Categories**: Frontend
2. **Availability**: ✓ Available as Mentor
3. **Result**: 12 participants with React, Next.js, TypeScript skills

### Scenario 3: Find Project Managers in DAO Space
1. **Text Search**: "DAO governance"
2. **Specific Skills**: Project Manager
3. **Result**: 8 participants with PM skills + DAO experience

---

## Success Metrics

### Usage Metrics
- % of event page visitors who use search
- Average number of filters applied per search
- Most popular skill categories searched

### Engagement Metrics
- Participant profile views from search results
- Contact/connection attempts from filtered results
- Time spent on participants tab (should increase)

### Data Quality Metrics
- % of participants with complete skill profiles
- % of participants with prior experience filled
- Average number of skills per participant

---

## Future Enhancements (Post-Launch)

1. **Saved Searches** - Let recruiters save filter combinations
2. **Email Alerts** - Notify when new participants match criteria
3. **Advanced Filters** - Location, years of experience, languages
4. **AI Matching** - Semantic search using embeddings for prior experience
5. **Bulk Actions** - Message multiple participants at once (admin)
6. **Participant Self-Tagging** - Let residents add more skills post-acceptance
7. **Skills Endorsements** - Peers can endorse each other's skills
8. **Project-Based Search** - Find participants by projects they've built

---

## Technical Considerations

### Performance
- **Query Optimization**: Use Prisma's `select` to minimize data transfer
- **Pagination**: Load 50 participants at a time, infinite scroll or pagination
- **Caching**: Cache skill catalog and categories (rarely change)
- **Debouncing**: 300ms delay on text search to reduce API calls

### Security
- **Public Access**: Participants tab is public after event starts
- **Rate Limiting**: Prevent scraping of participant data
- **Privacy**: Respect user privacy settings (hide email/phone)

### Accessibility
- **Keyboard Navigation**: All filters accessible via keyboard
- **Screen Readers**: Proper ARIA labels on search inputs
- **Color Contrast**: Ensure badges meet WCAG AA standards

---

## Migration Script Integration

The existing migration scripts have already recovered:
- ✅ 146 skill ratings (97% recovery)
- ✅ 144 prior experience entries (100% recovery)

**Ongoing Sync**: Fix the "Import from Applications" button to preserve these fields going forward (see `migration-specification.md`).

---

## Files to Create/Modify

### New Files
1. `src/app/events/[eventId]/_components/ParticipantSearchFilters.tsx`
2. `src/app/events/[eventId]/_components/ParticipantCard.tsx` (extract from EventDetailClient)
3. `src/server/api/routers/event.ts` - Add `searchParticipants` procedure

### Modified Files
1. `src/app/events/[eventId]/EventDetailClient.tsx` - Integrate search UI
2. `prisma/schema.prisma` - Add full-text search indexes (migration)

---

## Questions for Product Owner

1. **Visibility**: Should unaccepted applicants see the search functionality?
2. **Privacy**: Are all accepted participants okay with skills being searchable?
3. **Messaging**: Do you want in-app messaging between participants?
4. **Export**: Should admins be able to export filtered participant lists?
5. **Prior Experience**: Should full prior experience be visible or truncated?

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize phases** based on immediate needs
3. **Start with Phase 1** (Core Search) for quick value
4. **Iterate based on feedback** from first users
5. **Track analytics** to guide future enhancements

---

## Summary

This implementation will transform the static participants list into a **powerful talent discovery tool**, making it easy for:
- 🎯 **Recruiters** to find candidates with specific skills
- 👥 **Organizers** to match mentors with residents
- 🤝 **Participants** to find collaborators
- 📊 **Admins** to understand cohort skill distribution

**Total Estimated Time**: 15-20 hours for Phases 1-3 (core functionality)
