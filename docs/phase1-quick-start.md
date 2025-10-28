# Phase 1: Quick Start Guide

## Step 1: Run the Audit Script

I've created a comprehensive audit script that will show us exactly what data we have and what's being lost.

### Run the audit:

```bash
# From your project root
bun run scripts/audit-skill-data.ts

# Or save to file for analysis
bun run scripts/audit-skill-data.ts > audit-report.txt

# Or get JSON output for programmatic analysis
bun run scripts/audit-skill-data.ts --format json > audit-report.json
```

### What the audit will show:

1. **Summary Statistics**
   - How many users have profiles
   - How many use legacy vs normalized skills
   - Total applications and accepted applications

2. **Data Loss Analysis** (🔴 Critical)
   - How many skill ratings (1-10 scale) are lost
   - How many prior experience descriptions are missing
   - How many accepted applicants have incomplete profiles

3. **Skill Catalog Status**
   - Total skills in database
   - Skills with/without categories
   - Most popular skills
   - Average usage stats

4. **Data Quality Issues**
   - Duplicate skill variations (e.g., "React" vs "react" vs "React.js")
   - Orphaned database records
   - Profiles needing migration

5. **Event Breakdown**
   - Stats for each event
   - Application completion rates
   - Skills/ratings/experience capture rates

6. **Recommendations**
   - Prioritized list of actions to take
   - Which migration scripts to run
   - Critical vs informational issues

---

## Step 2: Review the Results

After running the audit, share the output with me and we'll:

1. **Analyze the severity** of data loss
2. **Prioritize fixes** based on impact
3. **Proceed with Phase 1 tasks**:
   - Add database schema fields
   - Create migration scripts
   - Update sync logic

---

## What's Next After Audit?

Based on the audit results, we'll complete Phase 1:

### Task 1: Add Database Schema Field
```bash
# Add priorExperience field to UserProfile
npx prisma migrate dev --name "add-prior-experience-to-profiles"
npx prisma generate
```

### Task 2: Create Migration Scripts
- `migrate-skill-ratings.ts` - Sync skill ratings to UserSkills
- `migrate-prior-experience.ts` - Sync experience to profiles

### Task 3: Update Profile Sync Logic
- Fix `src/server/api/routers/profile.ts` to preserve all data
- Ensure future applications don't lose data

### Task 4: Run Migrations
```bash
# Dry run first (see what would change)
bun run scripts/migrate-skill-ratings.ts

# Execute changes
bun run scripts/migrate-skill-ratings.ts --execute

# Same for prior experience
bun run scripts/migrate-prior-experience.ts
bun run scripts/migrate-prior-experience.ts --execute
```

### Task 5: Verify Success
```bash
# Run audit again to compare
bun run scripts/audit-skill-data.ts > audit-after.txt

# Compare before/after
diff audit-report.txt audit-after.txt
```

---

## Expected Timeline

- **Audit Analysis**: 5-10 minutes
- **Schema Changes**: 10-15 minutes
- **Migration Script Creation**: 30-45 minutes
- **Running Migrations**: 5-10 minutes
- **Verification**: 10-15 minutes

**Total Phase 1**: ~2 hours

---

## Safety Notes

✅ **Safe Operations**:
- Audit script is read-only (no data changes)
- All migrations have dry-run mode
- Database backups recommended before executing

⚠️ **Before Running Migrations**:
- Review dry-run output
- Backup database
- Run on staging environment first if available

---

## Questions?

Once you run the audit, we'll review the results together and:
1. Confirm the scope of data loss
2. Decide on migration priority
3. Proceed with the fixes

Ready to run the audit? Let me know what you find! 🚀
