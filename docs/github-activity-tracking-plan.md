# GitHub Activity Tracking Implementation Plan

## Overview
This document outlines the plan for tracking GitHub repository activity for projects in the Funding the Commons Residency program.

## Metrics to Track

### 1. **% of Projects Still Active**
**Definition**: Percentage of projects with GitHub commits in the last 30 days

**Data Points**:
- Total projects with GitHub repositories
- Projects with recent activity (commits in last 30 days)
- Calculation: `(active_projects / total_projects) * 100`

### 2. **Average Number of Weeks Project is Active**
**Definition**: Average duration of GitHub activity from first commit to most recent commit

**Data Points**:
- First commit date (repository creation or earliest accessible commit)
- Most recent commit date
- Duration in weeks: `(latest_commit - first_commit) / 7 days`
- Average across all projects

## Implementation Approach

### Phase 1: Database Schema Updates

**Add new fields to `Repository` model**:
```prisma
model Repository {
  // ... existing fields

  // Activity tracking fields
  lastCommitDate    DateTime?
  firstCommitDate   DateTime?
  totalCommits      Int       @default(0)
  lastSyncedAt      DateTime?
  isActive          Boolean   @default(false) // Active if commit in last 30 days
  weeksActive       Float?    // Duration in weeks
}
```

**Migration**:
```bash
bunx prisma migrate dev --name add-repository-activity-tracking
```

### Phase 2: GitHub API Integration

**Create GitHub Service** (`src/server/services/github.ts`):

```typescript
interface RepositoryActivity {
  lastCommitDate: Date | null;
  firstCommitDate: Date | null;
  totalCommits: number;
  isActive: boolean;
  weeksActive: number | null;
}

class GitHubService {
  async fetchRepositoryActivity(repoUrl: string): Promise<RepositoryActivity> {
    // Parse owner/repo from URL
    // Use GitHub API to fetch:
    //   - Latest commit (GET /repos/{owner}/{repo}/commits?per_page=1)
    //   - First commit (GET /repos/{owner}/{repo}/commits?per_page=1&sha=default_branch&order=asc)
    //   - Commit count (from pagination headers)
    // Calculate isActive and weeksActive
  }
}
```

**API Requirements**:
- Use GitHub REST API v3
- Authentication via Personal Access Token (store in env as `GITHUB_API_TOKEN`)
- Rate limiting: 5000 requests/hour (authenticated)
- Handle errors gracefully (private repos, deleted repos, etc.)

### Phase 3: Sync Script

**Create sync script** (`scripts/sync-github-activity.ts`):

```typescript
/**
 * GitHub Activity Sync Script
 *
 * Fetches activity data for all project repositories and updates database
 *
 * Usage:
 *   bun run scripts/sync-github-activity.ts [eventId]
 *
 * Example:
 *   bun run scripts/sync-github-activity.ts funding-commons-residency-2025
 */

async function main() {
  // 1. Fetch all repositories for event projects
  // 2. For each repository:
  //    - Fetch activity from GitHub API
  //    - Update database with activity data
  //    - Add delay between requests (rate limiting)
  // 3. Generate report of activity metrics
}
```

**Features**:
- Progress bar for sync status
- Error handling and retry logic
- Skip recently synced repos (lastSyncedAt within 6 hours)
- Summary report with statistics

### Phase 4: tRPC Endpoints

**Add to `src/server/api/routers/project.ts`**:

```typescript
// Get activity statistics for an event
getEventActivityStats: publicProcedure
  .input(z.object({
    eventId: z.string(),
  }))
  .query(async ({ ctx, input }) => {
    const repositories = await ctx.db.repository.findMany({
      where: {
        project: {
          profile: {
            user: {
              applications: {
                some: {
                  eventId: input.eventId,
                  status: "ACCEPTED",
                  applicationType: "RESIDENT",
                },
              },
            },
          },
        },
      },
      select: {
        isActive: true,
        weeksActive: true,
        lastSyncedAt: true,
      },
    });

    const activeProjects = repositories.filter(r => r.isActive).length;
    const totalProjects = repositories.length;
    const percentageActive = (activeProjects / totalProjects) * 100;

    const avgWeeksActive = repositories
      .filter(r => r.weeksActive !== null)
      .reduce((sum, r) => sum + (r.weeksActive ?? 0), 0) / repositories.length;

    return {
      percentageActive: percentageActive.toFixed(1),
      avgWeeksActive: avgWeeksActive.toFixed(1),
      lastSyncedAt: repositories[0]?.lastSyncedAt,
      totalProjects,
      activeProjects,
    };
  }),
```

### Phase 5: Frontend Integration

**Update Impact Report** (`src/app/impact-reports/funding-commons-residency-2025/page.tsx`):

```typescript
// Fetch GitHub activity stats
const { data: activityStats } = api.project.getEventActivityStats.useQuery({
  eventId: "funding-commons-residency-2025",
});

// Update additionalStats array
const additionalStats = [
  // ... existing stats
  {
    value: `${activityStats?.percentageActive ?? "TBD"}%`,
    label: "Projects Still Active",
    subtitle: "% with recent GitHub activity",
    icon: IconGitBranch,
    color: "green"
  },
  {
    value: activityStats?.avgWeeksActive ?? "TBD",
    label: "Avg. Weeks Active",
    subtitle: "GitHub activity duration",
    icon: IconClock,
    color: "blue"
  },
];
```

## Environment Variables

Add to `.env.local`:
```bash
GITHUB_API_TOKEN=ghp_your_github_personal_access_token_here
```

Add to `src/env.js`:
```javascript
server: {
  // ... existing vars
  GITHUB_API_TOKEN: z.string().optional(),
},
runtimeEnv: {
  // ... existing vars
  GITHUB_API_TOKEN: process.env.GITHUB_API_TOKEN,
},
```

## Cron Job Setup (Optional)

For automatic syncing:

**Vercel Cron** (vercel.json):
```json
{
  "crons": [{
    "path": "/api/cron/sync-github-activity",
    "schedule": "0 */6 * * *"
  }]
}
```

**API Route** (`src/app/api/cron/sync-github-activity/route.ts`):
```typescript
export async function GET(request: Request) {
  // Verify cron secret
  // Run sync for all active events
  // Return status
}
```

## Timeline

### Immediate (Placeholder in place)
- ✅ Add "TBD" placeholders to impact report
- ✅ Create implementation plan

### Phase 1 (Week 1)
- [ ] Update database schema
- [ ] Create migration
- [ ] Update Prisma types

### Phase 2 (Week 1-2)
- [ ] Implement GitHub service
- [ ] Add error handling and rate limiting
- [ ] Write unit tests

### Phase 3 (Week 2)
- [ ] Create sync script
- [ ] Test with sample repositories
- [ ] Handle edge cases (private repos, deleted repos)

### Phase 4 (Week 2)
- [ ] Add tRPC endpoints
- [ ] Test API responses

### Phase 5 (Week 3)
- [ ] Integrate with impact report
- [ ] Run initial sync
- [ ] Deploy to production

### Phase 6 (Optional)
- [ ] Set up automated syncing
- [ ] Add admin dashboard for sync status
- [ ] Add manual sync trigger in UI

## Error Handling

**Common Issues**:
1. **Private repositories**: Skip and log
2. **Deleted repositories**: Mark as inactive, preserve last known data
3. **Rate limiting**: Implement exponential backoff
4. **Invalid URLs**: Log and skip
5. **Network errors**: Retry with backoff

## Data Accuracy Considerations

1. **Sync Frequency**: Sync every 6 hours to balance freshness vs. API usage
2. **Activity Definition**: "Active" = commit in last 30 days (configurable)
3. **First Commit**: Use repository creation date as fallback if API limits reached
4. **Multiple Repos**: Count project as active if ANY repository is active
5. **Forks**: Track parent repository activity separately

## Success Metrics

- [ ] 95%+ of repositories successfully synced
- [ ] API calls within GitHub rate limits
- [ ] Sync completes in < 5 minutes for 42 projects
- [ ] Zero data loss during sync failures
- [ ] Accurate activity percentages matching manual verification

## Future Enhancements

1. **Commit Frequency Tracking**: Graph commits over time
2. **Contributor Metrics**: Number of unique contributors
3. **Language Stats**: Programming languages used
4. **PR Activity**: Track pull requests and reviews
5. **Issue Tracking**: Monitor open/closed issues
6. **Stars & Forks**: Track repository popularity
7. **Detailed Timeline**: Show activity by week
8. **Comparison View**: Compare cohorts or events

## Resources

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [Octokit.js Library](https://github.com/octokit/octokit.js) - Official GitHub API client
- [GitHub Rate Limiting](https://docs.github.com/en/rest/overview/rate-limits-for-the-rest-api)
- [Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

## Notes

- Start with manual sync script to validate approach
- Consider caching strategy for frequently accessed data
- Monitor API usage to avoid hitting rate limits
- Provide clear messaging when data is being synced
- Allow manual trigger for immediate updates
