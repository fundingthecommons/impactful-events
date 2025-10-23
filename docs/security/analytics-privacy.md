# Analytics Privacy & Security

## Overview

The FtC Platform Analytics System implements a comprehensive privacy-first approach to data access, ensuring that researchers can extract valuable insights while maintaining the highest standards of data protection for application participants.

## Privacy Protection Layers

### 1. Access Control

#### Role-Based Permissions
Analytics access is restricted to users with specific roles:

```typescript
// Required roles for analytics access
const AUTHORIZED_ROLES = ["admin", "staff", "researcher"];

function checkResearcherAccess(userRole?: string | null): void {
  if (!userRole || !AUTHORIZED_ROLES.includes(userRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Researcher access required. Please contact an administrator for analytics access.",
    });
  }
}
```

#### Multi-Level Access
- **Researcher**: Basic analytics endpoints with standard rate limits
- **Staff**: Extended access with higher rate limits
- **Admin**: Full access including rate limit management and audit tools

### 2. Text Sanitization

#### Comprehensive PII Removal

The `textSanitization.ts` utility removes or replaces personally identifiable information:

```typescript
// PII Patterns Detected and Removed:
const PII_PATTERNS = {
  emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phones: /(\+\d{1,3}\s?)?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g,
  urls: /https?:\/\/[^\s]+/g,
  names: /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g,
  addresses: /\b\d+\s+[A-Z][a-z]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi,
  salaries: /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g,
  companies: /\b(?:at\s+)?[A-Z][a-zA-Z\s]+(?:LLC|Inc|Corp|Ltd|Co\.|Company|Corporation|Technologies|Tech|Labs|Systems)\b/g
};
```

#### Sanitization Levels

**Standard Sanitization:**
- Preserves semantic structure with placeholders
- Example: "Contact me at john@example.com" → "Contact me at [EMAIL_ADDRESS]"

**Strict Sanitization:**
- Removes PII entirely or replaces with generic terms
- Example: "I'm John Smith" → "I am a developer"

#### Platform-Specific Detection

Special handling for social media and professional platforms:

```typescript
const PLATFORM_PATTERNS = {
  linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s]+/gi,
  github: /(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s]+/gi,
  twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[^\s]+/gi
};

// Replaced with: [LINKEDIN_PROFILE], [GITHUB_PROFILE], [TWITTER_PROFILE]
```

### 3. Cryptographic Anonymization

#### Synthetic ID Generation

All user and application identifiers are replaced with cryptographically secure synthetic IDs:

```typescript
function generateSyntheticId(realId: string, config: AnonymizationConfig): string {
  const secret = process.env.ANONYMIZATION_SECRET; // Required environment variable
  
  const hash = crypto
    .createHash('sha256')
    .update(realId + config.salt + secret)
    .digest('hex');
    
  return `${config.prefix}_${hash.substring(0, config.hashLength)}`;
}
```

#### ID Types and Formats

- **Participant IDs**: `PART_abc12345` (user identification)
- **Event Context IDs**: `EVT_def678` (event anonymization) 
- **Application IDs**: `APP_ghi901` (application tracking)
- **Session Tokens**: `SESS_jklmnopqrstu234` (rate limiting)

#### Irreversibility Guarantee

The anonymization process is designed to be cryptographically irreversible:

1. **Secret Salt**: Environment variable unknown to clients
2. **SHA-256 Hashing**: One-way cryptographic function
3. **Truncated Output**: Hash truncation prevents rainbow table attacks
4. **Context Salting**: Different contexts (participant vs. event) use different salts

### 4. Minimum Aggregation Thresholds

#### Group Size Protection

All analytics endpoints enforce minimum group sizes to prevent individual identification:

```typescript
const MIN_AGGREGATION_THRESHOLD = 5;

// Example: Demographics endpoint
if (applications.length < MIN_AGGREGATION_THRESHOLD) {
  return {
    eventContext: generateEventContextId(input.eventId),
    totalParticipants: 0,
    message: "Insufficient data for demographics analysis (minimum 5 participants required)"
  };
}
```

#### Threshold Applications

- **Text Corpus**: Questions with fewer than 5 responses are filtered out
- **Demographics**: No breakdown provided for groups under 5 participants
- **Skills Analysis**: Only skills with minimum occurrence counts are returned
- **Review Metrics**: Evaluation data requires minimum reviewer activity
- **Timeline Data**: Time periods are aggregated to prevent individual pattern identification

### 5. Rate Limiting & Abuse Prevention

#### Endpoint-Specific Limits

Rate limits are calibrated based on data sensitivity and potential for abuse:

```typescript
const RATE_LIMIT_MATRIX = {
  // Most sensitive - bulk text data
  APPLICATION_TEXT_CORPUS: {
    requests: 5,
    window: 60, // minutes
    blockDuration: 60
  },
  
  // Moderate sensitivity - aggregated statistics
  DEMOGRAPHICS_BREAKDOWN: {
    requests: 20,
    window: 60,
    blockDuration: 15
  },
  
  // High sensitivity - individual review patterns
  REVIEW_METRICS: {
    requests: 10,
    window: 60,
    blockDuration: 30
  }
};
```

#### Progressive Blocking

Users who exceed rate limits face automatic blocking:

1. **Warning Phase**: Requests close to limit receive warning headers
2. **Blocking Phase**: Exceeded users are temporarily blocked
3. **Escalation**: Repeated violations result in longer blocks
4. **Admin Override**: Administrators can reset limits for legitimate users

### 6. Audit Trail & Monitoring

#### Comprehensive Logging

Every analytics request is logged with complete context:

```typescript
interface AnalyticsAuditLog {
  userId: string;              // Who accessed the data
  endpoint: string;            // Which endpoint was used
  eventId?: string;           // What event was queried
  dataRequested: string;       // Description of data returned
  requestParams: object;       // Full request parameters
  responseSize: number;        // Size of response data
  ipAddress: string;          // Source IP for security
  userAgent: string;          // Browser/client information
  timestamp: Date;            // When access occurred
}
```

#### Security Monitoring

Audit logs enable detection of:

- **Unusual Access Patterns**: Bulk downloading or systematic access
- **Role Escalation Attempts**: Users trying to access unauthorized data
- **Rate Limit Circumvention**: Multiple accounts or sessions from same source
- **Data Correlation Attempts**: Patterns suggesting re-identification efforts

## Data Minimization Principles

### 1. Purpose Limitation

Analytics data access is restricted to legitimate research purposes:

- **Broad Listening Analysis**: Natural language processing for insights
- **Demographics Research**: Population distribution analysis
- **Skills Trend Analysis**: Technology and expertise tracking
- **Application Pattern Studies**: Submission and review process optimization

### 2. Temporal Restrictions

Data access follows time-based limitations:

- **Active Events Only**: Historical event data requires special approval
- **Retention Limits**: Audit logs and cached data have defined retention periods
- **Access Windows**: Some analyses restricted to specific time periods

### 3. Scope Restrictions

Data access is limited in scope:

- **Event-Specific**: Most endpoints require specific event context
- **Question-Specific**: Text corpus can be limited to specific questions
- **Status-Specific**: Demographics can be filtered by application status
- **Aggregation-Only**: No individual record access through analytics API

## Environment Security

### Required Environment Variables

```bash
# Cryptographic secret for anonymization (REQUIRED)
ANONYMIZATION_SECRET=your-256-bit-secret-key-here

# Database connection with appropriate permissions
DATABASE_URL=your-database-connection-string

# Application secret for session management
AUTH_SECRET=your-auth-secret-here
```

### Secret Management Best Practices

1. **Unique Secrets**: Use different secrets for different environments
2. **Key Rotation**: Regular rotation of `ANONYMIZATION_SECRET`
3. **Access Control**: Limit who can view environment variables
4. **Backup Security**: Secure backup of secrets for disaster recovery

## Compliance & Validation

### PII Detection Validation

The system includes validation tools to detect remaining PII:

```typescript
function detectPotentialPII(text: string): {
  hasPotentialPII: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Pattern-based detection for missed PII
  if (text.includes('@')) warnings.push('Contains @ symbol - possible email');
  if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text)) warnings.push('Contains phone number pattern');
  if (/linkedin|github|twitter/i.test(text)) warnings.push('Contains social media references');
  
  return { hasPotentialPII: warnings.length > 0, warnings };
}
```

### Anonymization Integrity Checks

Regular validation ensures anonymization is working correctly:

```typescript
function validateAnonymization(original: any, anonymized: any): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check for ID leakage
  if ('id' in anonymized || anonymized.anonymousId === original.id) {
    issues.push('Original ID present in anonymized data');
  }
  
  // Validate ID format
  if (!/^[A-Z]+_[a-f0-9]+$/.test(anonymized.anonymousId)) {
    issues.push('Invalid anonymous ID format');
  }
  
  return { isValid: issues.length === 0, issues };
}
```

## Incident Response

### Data Breach Protocol

In case of suspected privacy breach:

1. **Immediate Response**: Disable affected user accounts and analytics access
2. **Impact Assessment**: Determine scope of potential data exposure
3. **Audit Review**: Analyze audit logs for full access history
4. **Notification**: Follow legal requirements for breach notification
5. **Remediation**: Implement additional controls and monitoring

### Privacy Violation Detection

Automated monitoring for potential violations:

- **Unusual Download Patterns**: Bulk data access outside normal research patterns
- **Cross-Reference Attempts**: Patterns suggesting re-identification efforts
- **Rate Limit Abuse**: Systematic attempts to circumvent access controls
- **Data Export Violations**: Unauthorized sharing or export of analytics data

## Research Ethics

### Approved Use Cases

Analytics access is approved for:

- **Academic Research**: Published studies with proper attribution
- **Platform Improvement**: Internal analysis for process optimization
- **Diversity Studies**: Demographics analysis for inclusion efforts
- **Technology Trends**: Skills and technology adoption research

### Prohibited Activities

Analytics access may not be used for:

- **Individual Identification**: Any attempt to re-identify participants
- **Commercial Exploitation**: Sale or licensing of participant data
- **Discrimination**: Using insights for exclusionary practices
- **Surveillance**: Monitoring or tracking individual participants

### Researcher Responsibilities

Users with analytics access must:

1. **Protect Data**: Implement appropriate security for downloaded data
2. **Limit Sharing**: Restrict access to authorized research team members
3. **Cite Sources**: Acknowledge data source and privacy protections
4. **Report Issues**: Notify administrators of suspected privacy violations

## Future Enhancements

### Planned Privacy Features

- **Differential Privacy**: Mathematical privacy guarantees for statistical queries
- **Homomorphic Encryption**: Computation on encrypted data
- **Zero-Knowledge Proofs**: Query results without revealing underlying data
- **Federated Learning**: Model training without centralized data access

### Advanced Anonymization

- **K-Anonymity**: Ensuring each record is indistinguishable from k-1 others
- **L-Diversity**: Preventing attribute disclosure through diversity requirements
- **T-Closeness**: Maintaining attribute distribution similarity
- **Synthetic Data Generation**: Creating artificial datasets with similar properties

The analytics privacy system represents a comprehensive approach to balancing research utility with participant privacy, implementing multiple layers of protection to ensure data cannot be misused while still enabling valuable insights for platform improvement and academic research.