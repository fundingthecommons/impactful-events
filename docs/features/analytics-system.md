# Analytics System

## Overview

The FtC Platform Analytics System provides secure, anonymized access to aggregated application and review data for researchers and platform stakeholders. Built with privacy-first principles, the system enables data analysis while protecting personally identifiable information (PII) through comprehensive sanitization and anonymization mechanisms.

## Key Features

### 🔒 Privacy-First Design
- **Text Sanitization**: Automatic removal of PII from text content including emails, phone numbers, names, and addresses
- **Cryptographic Anonymization**: SHA-256 based synthetic ID generation that cannot be reversed
- **Minimum Aggregation Thresholds**: Groups with fewer than 5 participants are filtered out to prevent individual identification
- **Audit Logging**: Complete tracking of all analytics access for compliance and security monitoring

### 🚦 Access Control & Rate Limiting
- **Role-Based Access**: Restricted to users with `admin`, `staff`, or `researcher` roles
- **Per-Endpoint Rate Limiting**: Customized request limits based on data sensitivity
- **Progressive Blocking**: Automatic blocking for users who exceed rate limits
- **Session Management**: Cryptographic session tokens for secure rate limit tracking

### 📊 Research-Focused Endpoints
- **Text Corpus Analysis**: Sanitized application responses for Broad Listening tools
- **Demographics Breakdown**: Aggregated gender, region, and experience statistics
- **Skills Analysis**: Word cloud data from technical skills responses
- **Application Timeline**: Submission patterns and review activity over time
- **Review Metrics**: Anonymized reviewer activity and evaluation statistics

## Architecture

### Database Schema

The analytics system introduces two new database models:

#### AnalyticsAudit
```prisma
model AnalyticsAudit {
  id            String            @id @default(cuid())
  userId        String            // User who made the request
  endpoint      AnalyticsEndpoint // Which analytics endpoint was accessed
  eventId       String?           // Event context (if applicable)
  dataRequested String?           // Additional context about what data was requested
  requestParams Json?             // JSON of request parameters for debugging
  responseSize  Int?              // Size of response data (for monitoring)
  ipAddress     String?           // IP address for security monitoring
  userAgent     String?           // User agent for security monitoring
  createdAt     DateTime          @default(now())
}
```

#### AnalyticsRateLimit
```prisma
model AnalyticsRateLimit {
  id            String   @id @default(cuid())
  userId        String   // User being rate limited
  endpoint      AnalyticsEndpoint // Which endpoint
  requestCount  Int      @default(0) // Number of requests in current window
  windowStart   DateTime @default(now()) // Start of current rate limit window
  lastRequest   DateTime @default(now()) // Last request timestamp
  isBlocked     Boolean  @default(false) // Whether user is currently blocked
}
```

### Utility Modules

#### `analyticsAuth.ts`
- Role-based access control validation
- Rate limiting enforcement with configurable windows
- Audit logging for all analytics operations
- Admin functions for rate limit management

#### `textSanitization.ts`
- PII removal from text content
- Configurable sanitization levels (standard/strict)
- Pattern matching for emails, phones, URLs, names, addresses
- Validation functions to detect remaining PII

#### `anonymization.ts`
- Cryptographic synthetic ID generation
- Event context and participant anonymization
- Batch processing for large datasets
- Environment validation for required secrets

#### `demographics.ts`
- Gender normalization and categorization
- Latin America region detection
- Professional role classification
- Statistical calculation utilities

## Security Features

### Data Protection Layers

1. **Input Sanitization**: All text content processed through comprehensive PII removal
2. **Anonymization**: User and application IDs replaced with cryptographic hashes
3. **Aggregation**: Individual responses hidden within group statistics
4. **Access Control**: Multi-level permission checking before data access
5. **Audit Trail**: Complete logging of who accessed what data when

### Rate Limiting Configuration

Different endpoints have tailored rate limits based on data sensitivity:

```typescript
const DEFAULT_RATE_LIMITS = {
  APPLICATION_TEXT_CORPUS: {
    windowMinutes: 60,
    maxRequests: 5,        // Most restrictive - bulk text data
    blockDurationMinutes: 60,
  },
  DEMOGRAPHICS_BREAKDOWN: {
    windowMinutes: 60,
    maxRequests: 20,       // Moderate - aggregated statistics
    blockDurationMinutes: 15,
  },
  SKILLS_WORD_CLOUD: {
    windowMinutes: 60,
    maxRequests: 20,       // Moderate - skill frequency data
    blockDurationMinutes: 15,
  },
  APPLICATION_TIMELINE: {
    windowMinutes: 60,
    maxRequests: 15,       // More restrictive - temporal patterns
    blockDurationMinutes: 30,
  },
  REVIEW_METRICS: {
    windowMinutes: 60,
    maxRequests: 10,       // Restrictive - evaluation data
    blockDurationMinutes: 30,
  },
};
```

### Environment Requirements

The analytics system requires the following environment variable:

```bash
ANONYMIZATION_SECRET=your-secret-key-here
```

This secret is used as additional salt for cryptographic anonymization, ensuring synthetic IDs cannot be generated by external parties.

## Usage Examples

### Researcher Access
```typescript
// Get sanitized text corpus for Broad Listening analysis
const corpus = await api.analytics.getApplicationTextCorpus.query({
  eventId: "evt_123",
  questionKeys: ["why_apply", "technical_background"], 
  sanitizationLevel: "standard"
});

// Access demographics for visualization
const demographics = await api.analytics.getDemographicsBreakdown.query({
  eventId: "evt_123",
  status: "ACCEPTED"
});
```

### Admin Monitoring
```typescript
// Check analytics usage summary
const summary = await getAnalyticsAccessSummary(db, 30); // Last 30 days

// Reset rate limits if needed
await resetUserRateLimit(db, "user_123", "APPLICATION_TEXT_CORPUS");
```

## Integration Points

### David's Broad Listening Tool
The `getApplicationTextCorpus` endpoint is specifically designed to support David Dao's Broad Listening analysis tool:

- Returns sanitized text responses grouped by question type
- Includes metadata about response counts and average lengths
- Preserves semantic meaning while removing PII
- Supports configurable sanitization levels

### Demographics Dashboard
The `getDemographicsBreakdown` endpoint powers demographic visualization:

- Gender distribution with inclusive categories
- Latin America vs. non-LATAM regional breakdown
- Experience level categorization (junior/mid/senior)
- Percentage calculations for all categories

### Skills Analysis
The `getSkillsWordCloud` endpoint enables skills trend analysis:

- Frequency counting across all skill responses
- Support for both JSON array and comma-separated formats
- Configurable minimum occurrence thresholds
- Results sorted by frequency for visualization

## Monitoring & Maintenance

### Audit Trail Analysis
All analytics access is logged with:
- User identification and role
- Endpoint accessed and parameters used
- Data volume and response characteristics
- Timestamp and source IP for security

### Rate Limit Monitoring
The system provides visibility into:
- Current usage levels per user/endpoint
- Blocked users and automatic unblocking
- Request patterns and potential abuse
- Performance impact of rate limiting

### Data Quality Validation
Regular validation should include:
- PII detection in sanitized output
- Anonymization consistency checks
- Aggregation threshold compliance
- Response time and performance monitoring

## Best Practices

### For Researchers
1. **Cache Results**: Respect rate limits by caching analytics data locally
2. **Batch Processing**: Use single requests for comprehensive analysis rather than multiple small requests
3. **Sanitization Awareness**: Understand that text data has been processed for privacy
4. **Attribution**: Acknowledge data source and privacy protections in research

### For Administrators
1. **Regular Audits**: Review analytics access patterns monthly
2. **Rate Limit Tuning**: Adjust limits based on legitimate usage patterns
3. **Environment Security**: Protect the `ANONYMIZATION_SECRET` environment variable
4. **Data Retention**: Consider audit log retention policies

### For Developers
1. **Error Handling**: Properly handle rate limit and insufficient data errors
2. **Parameter Validation**: Validate all input parameters before processing
3. **Performance**: Monitor query performance with large datasets
4. **Testing**: Include privacy validation in all analytics tests

## Future Enhancements

### Planned Features
- **Differential Privacy**: Mathematical privacy guarantees for statistical queries
- **Advanced Aggregations**: Cross-event analysis with additional anonymization
- **Export Controls**: Structured data export with built-in privacy protection
- **Visualization APIs**: Direct integration with charting libraries

### Research Extensions
- **Longitudinal Analysis**: Cross-cohort comparisons over time
- **Predictive Analytics**: Success pattern identification
- **Network Analysis**: Anonymized referral and collaboration patterns
- **Sentiment Analysis**: Automated text analysis with privacy preservation

## Support & Contact

For questions about analytics access or data interpretation:
- **Technical Issues**: Contact platform administrators
- **Research Collaboration**: Coordinate with David Dao for Broad Listening integration
- **Privacy Concerns**: Review audit logs and sanitization processes
- **Rate Limit Adjustments**: Submit requests through admin channels

The analytics system represents a careful balance between research utility and privacy protection, enabling valuable insights while maintaining the highest standards of data protection for FtC Platform participants.