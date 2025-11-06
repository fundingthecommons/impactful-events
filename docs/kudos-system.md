# Kudos System Methodology

## Overview

The Kudos system is a social economy designed to incentivize meaningful contributions and engagement within the residency program. It creates a dynamic transfer economy where social capital (kudos) flows between participants based on their interactions.

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
| `BASE_KUDOS` | 100 | Starting kudos for all users |
| `UPDATE_WEIGHT` | 10 | Kudos minted per ProjectUpdate posted |
| `PRAISE_TRANSFER_RATE` | 5% | Percentage transferred when praising |
| `LIKE_TRANSFER_RATE` | 2% | Percentage transferred when liking |
| `BACKFILL_PRAISE_VALUE` | 5 | Default kudos for historical praise (no transfer data) |
| `BACKFILL_LIKE_VALUE` | 2 | Default kudos for historical likes (no transfer data) |

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
Initial Kudos = BASE_KUDOS +
                (ProjectUpdates × UPDATE_WEIGHT) +
                (Likes Received × BACKFILL_LIKE_VALUE) -
                (Likes Given × BACKFILL_LIKE_VALUE) +
                (Praise Received × BACKFILL_PRAISE_VALUE) -
                (Praise Sent × BACKFILL_PRAISE_VALUE)
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
- Carol (100 kudos) likes Bob's update → Carol: 100→98, Bob: +2
- Dave (50 kudos) likes Bob's update → Dave: 50→49, Bob: +1

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
- Carol (100 kudos) praises Bob → Carol: 100→95, Bob: +5
- Dave (50 kudos) praises Bob → Dave: 50→47.5, Bob: +2.5

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
- Like: Need at least 1 kudos (2% of 50 = 1)
- Praise: Need at least 2.5 kudos (5% of 50 = 2.5)

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
```

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

### Phase 2: Calculation Logic
- Create kudos calculation utility function
- Calculate initial kudos for all users (backfill)
- Update User.kudos field for existing users

### Phase 3: Display Integration
- Add Kudos column to Impact page Residents tab
- Implement sorting by kudos
- Add tooltip with formula explanation
- Style badges with gradient colors

### Phase 4: Transfer Implementation (Future)
- Update like mutations to transfer kudos
- Update praise mutations to transfer kudos
- Add kudos cost display in UI
- Implement minimum kudos checks

### Phase 5: Advanced Features (Future)
- Kudos leaderboard page
- Kudos history/transaction log
- Kudos analytics dashboard
- Export kudos data

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
