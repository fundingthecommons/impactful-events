# Analytics API Reference

## Overview

The Analytics API provides five secure endpoints for accessing anonymized application and review data. All endpoints require researcher-level access and implement rate limiting, audit logging, and comprehensive PII protection.

## Authentication

All analytics endpoints require authentication with a user account having one of the following roles:
- `admin`
- `staff` 
- `researcher`

Access is controlled through the platform's standard session authentication mechanism.

## Rate Limiting

Each endpoint has specific rate limits to prevent abuse and ensure system performance:

| Endpoint | Window | Max Requests | Block Duration |
|----------|--------|--------------|----------------|
| Application Text Corpus | 60 min | 5 | 60 min |
| Demographics Breakdown | 60 min | 20 | 15 min |
| Skills Word Cloud | 60 min | 20 | 15 min |
| Application Timeline | 60 min | 15 | 30 min |
| Review Metrics | 60 min | 10 | 30 min |

Rate limit exceeded responses return HTTP 429 with retry information.

## Error Responses

### Common Error Codes

- `FORBIDDEN` (403): Insufficient permissions for analytics access
- `TOO_MANY_REQUESTS` (429): Rate limit exceeded
- `BAD_REQUEST` (400): Invalid input parameters
- `INTERNAL_SERVER_ERROR` (500): Server processing error

### Insufficient Data Response

When aggregated data contains fewer than 5 participants, endpoints return:

```json
{
  "eventContext": "EVT_abc123",
  "totalParticipants": 0,
  "message": "Insufficient data for analysis (minimum 5 participants required)"
}
```

## Endpoints

### 1. Get Application Text Corpus

Retrieves sanitized text responses for Broad Listening analysis and natural language processing.

**Endpoint:** `analytics.getApplicationTextCorpus`

#### Input Schema

```typescript
{
  eventId: string;                          // Required: Event identifier
  questionKeys?: string[];                  // Optional: Specific questions to include
  includeMetadata?: boolean;                // Optional: Include response metadata (default: true)
  sanitizationLevel?: 'standard' | 'strict'; // Optional: PII removal level (default: 'standard')
}
```

#### Response Schema

```typescript
{
  eventContext: string;                     // Anonymous event identifier (e.g., "EVT_abc123")
  questionTypes: {
    [questionKey: string]: Array<{
      text: string;                         // Sanitized response text
      originalLength: number;               // Original text length for analysis
      participantId: string;                // Anonymous participant ID (e.g., "PART_def456")
    }>;
  };
  metadata?: {
    totalApplications: number;              // Total applications processed
    totalResponses: number;                 // Total text responses included
    questionCount: number;                  // Number of question types returned
    averageResponseLength: number;          // Average original response length
    sanitizationLevel: 'standard' | 'strict';
  };
}
```

#### Example Usage

```typescript
const corpus = await api.analytics.getApplicationTextCorpus.query({
  eventId: "evt_residency_2024",
  questionKeys: ["why_apply", "technical_background", "project_ideas"],
  sanitizationLevel: "standard",
  includeMetadata: true
});

// Access sanitized responses
corpus.questionTypes["why_apply"].forEach(response => {
  console.log(`Participant ${response.participantId}: ${response.text}`);
});
```

#### Rate Limiting
- **Window**: 60 minutes
- **Max Requests**: 5
- **Block Duration**: 60 minutes

---

### 2. Get Demographics Breakdown

Provides aggregated demographic statistics for visualization and analysis.

**Endpoint:** `analytics.getDemographicsBreakdown`

#### Input Schema

```typescript
{
  eventId: string;                          // Required: Event identifier
  status?: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'WAITLISTED' | 'CANCELLED'; // Optional: Filter by application status
  applicationType?: 'RESIDENT' | 'MENTOR'; // Optional: Filter by application type
}
```

#### Response Schema

```typescript
{
  eventContext: string;                     // Anonymous event identifier
  totalParticipants: number;                // Total participants in breakdown
  gender: {
    male: number;
    female: number;
    other: number;
    prefer_not_to_say: number;
    unspecified: number;
    percentages: {
      male: number;
      female: number;
      other: number;
      prefer_not_to_say: number;
      unspecified: number;
    };
  };
  region: {
    latam: number;                          // Latin America participants
    non_latam: number;                      // Non-Latin America participants  
    unspecified: number;
    percentages: {
      latam: number;
      non_latam: number;
      unspecified: number;
    };
  };
  experience: {
    junior: number;                         // 0-2 years experience
    mid: number;                            // 3-7 years experience
    senior: number;                         // 8+ years experience
    unspecified: number;
    percentages: {
      junior: number;
      mid: number;
      senior: number;
      unspecified: number;
    };
  };
}
```

#### Example Usage

```typescript
const demographics = await api.analytics.getDemographicsBreakdown.query({
  eventId: "evt_residency_2024",
  status: "ACCEPTED"
});

console.log(`Gender distribution: ${demographics.gender.percentages.female}% female, ${demographics.gender.percentages.male}% male`);
console.log(`Regional distribution: ${demographics.region.percentages.latam}% from Latin America`);
```

#### Rate Limiting
- **Window**: 60 minutes
- **Max Requests**: 20
- **Block Duration**: 15 minutes

---

### 3. Get Skills Word Cloud

Returns skills frequency data for word cloud visualization and skills trend analysis.

**Endpoint:** `analytics.getSkillsWordCloud`

#### Input Schema

```typescript
{
  eventId: string;                          // Required: Event identifier
  minOccurrences?: number;                  // Optional: Minimum skill occurrences (default: 2, min: 1)
  limit?: number;                           // Optional: Maximum skills returned (default: 50, max: 100)
}
```

#### Response Schema

```typescript
{
  eventContext: string;                     // Anonymous event identifier
  totalParticipants: number;                // Participants with skill data
  totalUniqueSkills: number;                // Total unique skills found
  skills: Array<{
    skill: string;                          // Skill name
    count: number;                          // Number of participants with this skill
    percentage: number;                     // Percentage of participants (rounded)
  }>;
  metadata: {
    minOccurrences: number;                 // Applied minimum occurrence filter
    topSkillsShown: number;                 // Number of skills in response
  };
}
```

#### Example Usage

```typescript
const skillsData = await api.analytics.getSkillsWordCloud.query({
  eventId: "evt_residency_2024",
  minOccurrences: 3,
  limit: 30
});

// Create word cloud visualization
skillsData.skills.forEach(skill => {
  console.log(`${skill.skill}: ${skill.count} participants (${skill.percentage}%)`);
});
```

#### Rate Limiting
- **Window**: 60 minutes
- **Max Requests**: 20
- **Block Duration**: 15 minutes

---

### 4. Get Application Timeline

Provides application submission patterns and temporal analysis data.

**Endpoint:** `analytics.getApplicationTimeline`

#### Input Schema

```typescript
{
  eventId: string;                          // Required: Event identifier
  granularity?: 'day' | 'week' | 'hour';   // Optional: Time grouping (default: 'day')
  includeStatus?: boolean;                  // Optional: Include status/type breakdowns (default: true)
}
```

#### Response Schema

```typescript
{
  eventContext: string;                     // Anonymous event identifier
  timeline: Array<{
    timestamp: string;                      // ISO timestamp for time period
    count: number;                          // Applications submitted in period
    statusBreakdown?: {                     // Included if includeStatus: true
      [status: string]: number;             // Count by application status
    };
    typeBreakdown?: {                       // Included if includeStatus: true
      [type: string]: number;               // Count by application type (RESIDENT/MENTOR)
    };
  }>;
  metadata: {
    totalSubmissions: number;               // Total applications in timeline
    granularity: 'day' | 'week' | 'hour';
    timeRange: {
      earliest: Date;                       // First submission timestamp
      latest: Date;                         // Last submission timestamp
    };
  };
}
```

#### Example Usage

```typescript
const timeline = await api.analytics.getApplicationTimeline.query({
  eventId: "evt_residency_2024",
  granularity: "day",
  includeStatus: true
});

timeline.timeline.forEach(point => {
  console.log(`${point.timestamp}: ${point.count} submissions`);
  if (point.statusBreakdown) {
    console.log(`  Accepted: ${point.statusBreakdown.ACCEPTED ?? 0}`);
    console.log(`  Rejected: ${point.statusBreakdown.REJECTED ?? 0}`);
  }
});
```

#### Rate Limiting
- **Window**: 60 minutes
- **Max Requests**: 15
- **Block Duration**: 30 minutes

---

### 5. Get Review Metrics

Returns aggregated review activity and evaluation statistics without exposing individual reviewer data.

**Endpoint:** `analytics.getReviewMetrics`

#### Input Schema

```typescript
{
  eventId: string;                          // Required: Event identifier
  includeTimeline?: boolean;                // Optional: Include daily review timeline (default: false)
}
```

#### Response Schema

```typescript
{
  eventContext: string;                     // Anonymous event identifier
  totalEvaluations: number;                 // Total evaluations created
  completedEvaluations: number;             // Evaluations marked complete
  averageTimePerReview: number;             // Average review time in minutes
  totalReviewHours: number;                 // Total time spent reviewing (rounded)
  scoreDistribution: {                      // Score frequency (0-10 scale)
    [score: number]: number;                // Count of evaluations with this score
  };
  recommendationBreakdown: {                // Recommendation frequency
    [recommendation: string]: number;       // Count by recommendation type
  };
  stageBreakdown: {                         // Review stage distribution
    [stage: string]: number;                // Count by review stage
  };
  averageConfidence: number;                // Average reviewer confidence (if available)
  timeline?: Array<{                        // Included if includeTimeline: true
    date: string;                           // Date (YYYY-MM-DD)
    reviewsCompleted: number;               // Reviews completed on this date
  }>;
  metadata: {
    includeTimeline: boolean;
    dataQuality: {
      hasTimeData: number;                  // Evaluations with time tracking
      hasScoreData: number;                 // Evaluations with scores
      hasRecommendationData: number;        // Evaluations with recommendations
    };
  };
}
```

#### Example Usage

```typescript
const reviewMetrics = await api.analytics.getReviewMetrics.query({
  eventId: "evt_residency_2024",
  includeTimeline: true
});

console.log(`${reviewMetrics.completedEvaluations} reviews completed`);
console.log(`Average review time: ${reviewMetrics.averageTimePerReview} minutes`);
console.log(`Total review effort: ${reviewMetrics.totalReviewHours} hours`);

// Analyze score distribution
Object.entries(reviewMetrics.scoreDistribution).forEach(([score, count]) => {
  console.log(`Score ${score}: ${count} reviews`);
});
```

#### Rate Limiting
- **Window**: 60 minutes
- **Max Requests**: 10
- **Block Duration**: 30 minutes

## Data Privacy & Security

### Anonymization

All endpoints implement comprehensive anonymization:

- **User IDs**: Replaced with cryptographic synthetic IDs (e.g., `PART_abc123`)
- **Event IDs**: Replaced with context IDs (e.g., `EVT_def456`)
- **Application IDs**: Replaced with anonymous application IDs
- **Text Content**: Processed through PII sanitization

### Text Sanitization

Text responses are processed to remove:

- Email addresses → `[EMAIL_ADDRESS]` or removed
- Phone numbers → `[PHONE_NUMBER]`
- URLs → `[URL]` or removed
- Names → `[PERSON_NAME]` or contextual replacement
- Addresses → `[ADDRESS]`
- Social media profiles → `[PLATFORM_PROFILE]`
- Company names → `[COMPANY_NAME]`
- Salary information → `[COMPENSATION_INFO]`

### Minimum Aggregation Thresholds

To prevent individual identification:

- Responses grouped with fewer than 5 participants are filtered out
- Demographics breakdowns require minimum 5 total participants
- Skills data shows only skills with minimum occurrence thresholds
- Timeline data aggregates submission patterns across time periods

### Audit Logging

All analytics requests are logged with:

- User ID and role
- Endpoint accessed and parameters
- Data volume and response characteristics
- Timestamp and source IP
- Request context and event ID

## Integration Examples

### Broad Listening Tool Integration

```typescript
// David's Broad Listening analysis workflow
const textCorpus = await api.analytics.getApplicationTextCorpus.query({
  eventId: eventId,
  questionKeys: ["motivation", "background", "goals"],
  sanitizationLevel: "standard"
});

// Process with Broad Listening algorithms
const insights = await broadListeningAnalysis(textCorpus.questionTypes);
```

### Demographics Dashboard

```typescript
// Real-time demographics visualization
const demographics = await api.analytics.getDemographicsBreakdown.query({
  eventId: activeEventId,
  status: "SUBMITTED"
});

// Update dashboard charts
updateGenderChart(demographics.gender);
updateRegionChart(demographics.region);
updateExperienceChart(demographics.experience);
```

### Skills Trend Analysis

```typescript
// Skills frequency analysis across events
const currentSkills = await api.analytics.getSkillsWordCloud.query({
  eventId: currentEventId,
  minOccurrences: 2
});

const previousSkills = await api.analytics.getSkillsWordCloud.query({
  eventId: previousEventId,
  minOccurrences: 2
});

// Compare skill trends between events
const trendAnalysis = compareSkillTrends(currentSkills, previousSkills);
```

## Best Practices

### Request Optimization

1. **Cache Results**: Store analytics data locally to minimize API calls
2. **Batch Parameters**: Use comprehensive queries rather than multiple small requests  
3. **Monitor Rate Limits**: Check remaining quota before making requests
4. **Handle Errors**: Implement proper retry logic for rate limit errors

### Data Interpretation

1. **Understand Anonymization**: Remember that IDs are synthetic and cannot be linked back
2. **Account for Filtering**: Small groups are filtered out for privacy protection
3. **Validate Sample Sizes**: Check participant counts before drawing conclusions
4. **Consider Sanitization**: Text analysis should account for PII removal

### Security Considerations

1. **Protect Access**: Keep analytics access restricted to authorized users
2. **Audit Usage**: Regular review of analytics access patterns
3. **Data Retention**: Consider local data retention policies for cached results
4. **Export Controls**: Be mindful of data export and sharing policies

The Analytics API provides powerful insights while maintaining the highest standards of privacy protection and data security.