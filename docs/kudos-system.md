# Kudos System Methodology

## Overview

The Kudos system is a social economy designed to incentivize meaningful contributions and engagement within the residency program. It creates a dynamic transfer economy where social capital (kudos) flows between participants based on their interactions.

Beyond being a social feedback mechanism, the Kudos system serves as a signal-gathering experiment to better understand how collaboration, support, and recognition manifest within the residency. By documenting these interactions — who contributes, supports, or uplifts others — we generate valuable qualitative and quantitative data about community dynamics.

This documentation is essential for impact evaluation, helping us move beyond anecdotal assessments toward a structured understanding of what kinds of actions, relationships, and projects create measurable value in the context of the residency. In this sense, the primary motivation for the Kudos system is not gamification, but building a transparent, data-informed foundation for evaluating and amplifying impact across the community.

At the same time, I acknowledge the risks and sensitivities of introducing such a system — especially around perception, fairness, and unintended incentives. This is why the Kudos system should be seen as a playful experiment, not a definitive measure of worth or contribution. Input, critique, and co-design from participants are actively encouraged, as the system itself is meant to evolve through reflection, feedback, and lived experience within the residency.

## Core Principles

### 1. **Zero-Sum Transfers**
- When users engage with content (likes, praise), they transfer a percentage of their own kudos
- The recipient gains exactly what the sender loses
- This makes engagement precious and meaningful
- Exception: Creating content (ProjectUpdates) mints new kudos into the system

### 2. **Influence Scaling**
- High-kudos users' engagement is more valuable
- A like from someone with 500 kudos is worth more than a like from someone with 50 kudos
- This creates natural meritocracy - recognition from respected contributors is more valuable

### 3. **Strategic Resource Management**
- Users must decide how to "spend" their kudos
- Frequent engagement depletes kudos
- Requires thoughtful, selective engagement
- Encourages quality over quantity

## Kudos Economics

### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `KUDOS_PER_DAY` | 10 | Kudos earned per day of residency attendance |
| `DAYS_ATTENDED` | 13 | Current days of residency (assumed all residents present) |
| `BASE_KUDOS` | 130 | Starting kudos (10 × 13 days) |
| `UPDATE_WEIGHT` | 10 | Kudos minted per ProjectUpdate posted |
| `PRAISE_TRANSFER_RATE` | 5% | Percentage transferred when praising |
| `LIKE_TRANSFER_RATE` | 2% | Percentage transferred when liking |
| `BACKFILL_PRAISE_VALUE` | 5 | Default kudos for historical praise (no transfer data) |
| `BACKFILL_LIKE_VALUE` | 2 | Default kudos for historical likes (no transfer data) |

### Base Kudos Calculation

**Formula**: `BASE_KUDOS = DAYS_ATTENDED × KUDOS_PER_DAY`

**Current Calculation**: `130 = 13 days × 10 kudos/day`

**Rationale**:
- Rewards consistent attendance at the residency
- 10 kudos per day recognizes physical presence and participation
- As residency progresses, base kudos increases for all residents
- Currently assumes all residents have attended all 13 days
- Future: Can be personalized based on actual attendance tracking

**Attendance-Based Kudos**:
- Day 1: 10 base kudos
- Day 7: 70 base kudos
- Day 13: 130 base kudos (current)
- Day 30: 300 base kudos (projected)

This creates a growing baseline that:
1. Rewards commitment to the program
2. Provides increasing "spending power" over time
3. Ensures even less active residents have kudos to engage
4. Reflects that longer tenure = more social capital

### Transfer Rates Rationale

**Why 5% for Praise?**
- Praise is thoughtful, written feedback
- Should be more costly than a casual like
- Prevents spam while allowing meaningful recognition
- Example: User with 500 kudos transfers 25 kudos per praise

**Why 2% for Likes?**
- Likes are quick, casual engagement
- Should be affordable to encourage frequent use
- Still has cost to prevent mindless clicking
- Example: User with 500 kudos transfers 10 kudos per like

### Kudos Calculation Formula

**Initial Kudos (One-Time Backfill)**:
```
Initial Kudos = (DAYS_ATTENDED × KUDOS_PER_DAY) +
                (ProjectUpdates × UPDATE_WEIGHT) +
                (Likes Received × BACKFILL_LIKE_VALUE) -
                (Likes Given × BACKFILL_LIKE_VALUE) +
                (Praise Received × BACKFILL_PRAISE_VALUE) -
                (Praise Sent × BACKFILL_PRAISE_VALUE)

Current Values:
Initial Kudos = (13 × 10) +
                (ProjectUpdates × 10) +
                (Likes Received × 2) -
                (Likes Given × 2) +
                (Praise Received × 5) -
                (Praise Sent × 5)
```

**Ongoing Kudos Calculation**:
```
Current Kudos = Initial Kudos +
                (New ProjectUpdates × 10) +
                (New Likes Received × [2% of liker's kudos at time]) -
                (New Likes Given × [2% of your kudos at time]) +
                (New Praise Received × [5% of sender's kudos at time]) -
                (New Praise Sent × [5% of your kudos at time])
```

**Note on Attendance**: Currently all residents assumed to have attended all 13 days (130 base kudos). Future implementations can track actual attendance and adjust base kudos accordingly.

## Action Economics

### Creating Content (Kudos Generation)

| Action | Kudos Change | Type |
|--------|-------------|------|
| Post ProjectUpdate | +10 kudos | Generation (mints new kudos) |

**Rationale**: Content creation is the foundation of the community. It should be rewarded generously to encourage consistent contributions. This is the only action that creates new kudos in the system.

### Liking Content (2% Transfer)

| Action | Sender | Recipient |
|--------|--------|-----------|
| Like ProjectUpdate | -2% of kudos | +2% of sender's kudos |
| Like AskOffer | -2% of kudos | +2% of sender's kudos |
| Like UserProject | -2% of kudos | +2% of sender's kudos |

**Rationale**:
- Casual engagement should be easy but not free
- 2% allows frequent liking without depleting kudos too quickly
- All like types have same cost (simplicity)

**Example Scenarios**:
- Alice (500 kudos) likes Bob's update → Alice: 500→490, Bob: +10
- Carol (200 kudos) likes Bob's update → Carol: 200→196, Bob: +4
- Dave (130 kudos) likes Bob's update → Dave: 130→127.4, Bob: +2.6

**Note**: With 130 base kudos, even new residents with no activity have ~2.6 kudos to transfer per like, ensuring everyone can participate meaningfully from day one.

### Giving Praise (5% Transfer)

| Action | Sender | Recipient |
|--------|--------|-----------|
| Send Praise | -5% of kudos | +5% of sender's kudos |

**Rationale**:
- Praise is meaningful, written feedback
- Higher cost than likes reflects greater value
- 5% is significant but not prohibitive
- Encourages thoughtful, selective praising

**Example Scenarios**:
- Alice (500 kudos) praises Bob → Alice: 500→475, Bob: +25
- Carol (200 kudos) praises Bob → Carol: 200→190, Bob: +10
- Dave (130 kudos) praises Bob → Dave: 130→123.5, Bob: +6.5

**Note**: With 130 base kudos, even new residents can give meaningful praise worth 6.5 kudos, making their recognition valuable from the start.

## Behavioral Economics

### Incentive Structure

**What behaviors are encouraged:**
1. **Consistent content creation** - Most reliable way to earn kudos (+10 per update)
2. **Receiving recognition** - Builds kudos through others' transfers
3. **Strategic engagement** - Thoughtful use of likes/praise
4. **Quality over quantity** - Selective engagement preserves kudos

**What behaviors are discouraged:**
1. **Spam engagement** - Rapidly depletes kudos
2. **Inactive participation** - No kudos generation from updates
3. **Mindless liking** - Costs add up quickly
4. **Praise inflation** - Each praise has real cost

### Game Theory Implications

**Nash Equilibrium**:
- Optimal strategy: Post regular updates + selectively engage with others
- Sub-optimal: Only receive without giving (builds kudos but reduces social capital)
- Sub-optimal: Over-engage without creating (depletes kudos)

**Tragedy of the Commons Prevention**:
- Transfer cost prevents free-rider problem
- Can't just "take" recognition without cost
- Must contribute to maintain kudos balance

**Reputation Dynamics**:
- High kudos = trusted, valued contributor
- Recognition from high-kudos users is more valuable
- Creates natural hierarchy based on contribution

## Edge Cases & Safeguards

### Minimum Kudos Scenarios

**Question**: Can kudos go negative?
**Answer**: No, kudos floor is 0.

**Question**: Can users engage at 0 kudos?
**Answer**: No - must have sufficient kudos to cover transfer cost.

**Minimum Requirements**:
- Like: Need at least 2.6 kudos (2% of 130 = 2.6)
- Praise: Need at least 6.5 kudos (5% of 130 = 6.5)

**Practical Impact**: With 130 base kudos from attendance, all residents start with sufficient kudos to:
- Give ~50 likes before depleting base kudos (130 / 2.6 = 50)
- Give ~20 praises before depleting base kudos (130 / 6.5 = 20)

This ensures active participation is possible even without creating updates.

### Historical Data Backfill

**Problem**: Existing likes/praise have no transfer values.

**Solution**: Backfill with default values
- Old likes: 2 kudos (both received and given)
- Old praise: 5 kudos (both received and sent)
- Approximates average transfer value
- Ensures fair initial kudos distribution

**Backfill Process**:
1. Calculate each user's ProjectUpdate count
2. Count historical likes received/sent
3. Count historical praise received/sent
4. Apply formula with backfill constants
5. Set User.kudos to calculated value

### Gaming Prevention

**Concern**: Coordinated kudos pumping (users repeatedly praising each other)

**Mitigations**:
1. Each praise costs 5% - limits frequency
2. Visible in transaction history
3. Requires sustained effort with diminishing returns
4. Community reputation matters beyond just kudos number

**Concern**: Hoarding kudos (never engaging)

**Mitigation**:
- Not prevented by design
- High kudos without engagement is visible
- Social pressure to participate
- Unused kudos don't provide value
- Community can choose not to engage with hoarders

## Data Model

### Database Fields Added

**User Model**:
```prisma
kudos Float @default(100.0)  // Current kudos balance
```

**All Like Models** (ProjectUpdateLike, AskOfferLike, UserProjectLike):
```prisma
kudosTransferred Float?      // Amount transferred with this like
likerKudosAtTime Float?      // Liker's total kudos when they liked
```

**Praise Model**:
```prisma
kudosTransferred Float?      // Amount transferred with this praise
senderKudosAtTime Float?     // Sender's total kudos when they praised
```

### Why Track Historical Kudos?

**Purpose of `likerKudosAtTime` / `senderKudosAtTime`**:
- Audit trail - can verify calculations
- Historical analysis - see kudos evolution over time
- Debugging - identify calculation discrepancies
- Transparency - users can see what kudos they had when they engaged

## User Interface

### Impact Page - Residents Tab

**New Column: Kudos**
- Displayed as sortable column
- Badge with gradient color:
  - Gold/yellow: High kudos (500+)
  - Green: Medium kudos (100-500)
  - Blue: Low kudos (0-100)
- Default sort: Descending by kudos
- Tooltip explaining kudos formula

**Sample Display**:
```
| Resident      | Projects | Updates | Praise Sent | Praise Received | Kudos |
|---------------|----------|---------|-------------|-----------------|-------|
| Alice Smith   | 2        | 15      | 8           | 12              | 523   |
| Bob Jones     | 1        | 10      | 5           | 8               | 387   |
| Carol Davis   | 3        | 8       | 12          | 6               | 285   |
| New Resident  | 0        | 0       | 0           | 0               | 130   |
```

**Note**: All residents start with 130 base kudos (13 days × 10 kudos/day), ensuring even new or inactive participants have social capital to engage with the community.

### Future UI Enhancements

**Like/Praise Actions**:
- Show kudos cost before confirming
- Display: "This will transfer 10 kudos from you"
- Disable action if insufficient kudos
- Show kudos received on engagement notifications

**User Profiles**:
- Display current kudos prominently
- Kudos history chart
- Breakdown: Earned vs transferred
- Kudos leaderboard link

**Kudos Leaderboard Page**:
- Top contributors by kudos
- Filter by time period
- Show kudos velocity (change over time)
- Compare to own kudos

## Implementation Phases

### Phase 1: Database Schema
- Add kudos field to User model
- Add transfer tracking to all Like models
- Add transfer tracking to Praise model
- Create and run migration

### Phase 2: Calculation Logic ✅ COMPLETE
- Create kudos calculation utility function with constants:
  - `KUDOS_PER_DAY = 10`
  - `DAYS_ATTENDED = 13` (current)
  - `BASE_KUDOS = 130` (calculated as 13 × 10)
- Created initialization script at `scripts/init-kudos.ts`
- Script calculates initial kudos for all users (backfill):
  - Base: 130 kudos (attendance)
  - Plus: Historical updates, likes, praise

### Phase 3: Display Integration ✅ COMPLETE
- Add Kudos column to Impact page Residents tab
- Implement sorting by kudos
- Style badges with gradient colors (gold/green/blue/gray)
- Default sort by kudos descending

### Phase 4: Initialization (READY TO RUN)

**Initialize kudos for all users:**

```bash
bunx tsx scripts/init-kudos.ts
```

**What the script does:**
1. Calculates kudos for each user based on historical activity
2. Updates the `kudos` field in the database
3. Displays detailed summary with top performers
4. Shows breakdown of kudos sources for each user

**Calculation includes:**
- Base attendance: 130 kudos (13 days × 10 kudos/day)
- Project updates created: +10 kudos each
- Likes received (all types): +2 kudos each (backfill value)
- Likes given (all types): -2 kudos each (backfill value)
- Praise received: +5 kudos each (backfill value)
- Praise sent: -5 kudos each (backfill value)

**Example output:**
```
✅ Alice Johnson: 215 kudos
✅ Bob Smith: 185 kudos
✅ Carol Williams: 152 kudos

📊 KUDOS INITIALIZATION SUMMARY
Total Users Processed: 47
Successful Updates: 47
Total Kudos in System: 7,245
Average Kudos: 154

🏆 TOP 10 KUDOS LEADERS:
1. Alice Johnson        215 kudos (updates: 8, praise: +5/-2, likes: +12/-8)
2. Bob Smith           185 kudos (updates: 5, praise: +4/-1, likes: +8/-5)
...
```

### Phase 5: Transfer Implementation (Next)
- Update like mutations to transfer kudos in real-time
- Update praise mutations to transfer kudos in real-time
- Add UI feedback showing kudos cost before action
- Implement minimum kudos checks
- Disable actions if insufficient kudos

### Phase 6: Advanced Features (Future)
- Kudos leaderboard page
- Kudos history/transaction log
- Kudos analytics dashboard
- Export kudos data
- Weekly kudos reports
- Badges for kudos milestones

## Success Metrics

**Engagement Quality**:
- Average kudos per resident increases over time
- Praise/like ratio indicates thoughtful engagement
- Content creation rate remains high

**System Health**:
- Kudos distribution follows expected curve (few high, many medium, few low)
- Total kudos in system grows steadily (from updates)
- Transfer velocity indicates active engagement

**User Satisfaction**:
- Residents understand kudos system
- Kudos is perceived as fair measure of contribution
- Top kudos earners are recognized community leaders

## Future Considerations

### Potential Enhancements

1. **Kudos Decay**: Slowly reduce kudos over time to prevent hoarding
2. **Seasonal Reset**: Periodic kudos resets for new cohorts
3. **Kudos Tiers**: Unlock privileges at certain kudos levels
4. **Kudos NFTs**: Mint NFTs for top kudos earners
5. **Kudos Marketplace**: Spend kudos on services/resources
6. **Team Kudos**: Pool kudos for collaborative projects
7. **Kudos Delegation**: Lend kudos to others temporarily
8. **Kudos Staking**: Lock kudos for multiplied rewards

### Potential Challenges

1. **Complexity**: System may be hard for new users to understand
   - Solution: Detailed onboarding, tooltips, help documentation

2. **Calculation Performance**: Kudos calculation may be expensive
   - Solution: Cache calculated kudos, recalculate periodically

3. **Fairness Perception**: Users may feel system is unfair
   - Solution: Full transparency, visible formula, audit logs

4. **Low Kudos Stigma**: Users with low kudos may feel excluded
   - Solution: Emphasize growth, highlight improvements, base kudos ensures participation

## Conclusion

The Kudos system transforms social engagement from free, limitless actions into a strategic resource management game. By making engagement costly, it ensures that likes and praise carry real weight and meaning. The transfer economy creates natural incentives for content creation while rewarding those who receive recognition from influential community members.

This system aligns incentives between individual success (high kudos) and community health (active engagement), creating a sustainable social economy that rewards genuine contribution and thoughtful participation.
