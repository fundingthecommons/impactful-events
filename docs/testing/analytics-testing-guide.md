# Analytics API Testing Guide

## Overview

This guide explains how to test the FtC Platform Analytics System using the comprehensive testing script located at `scripts/test-analytics-api.ts`.

## Prerequisites

### 1. User Account Setup
- Create an account on the FtC Platform
- Contact an administrator to assign one of these roles:
  - `researcher` - Basic analytics access
  - `staff` - Extended access with higher rate limits
  - `admin` - Full access including management capabilities

### 2. Environment Configuration
Ensure the following environment variable is configured:
```bash
ANONYMIZATION_SECRET=your-256-bit-secret-key-here
```

### 3. Database Setup
- Active PostgreSQL database with application data
- At least one event with minimum 5 applications (for aggregation thresholds)

## Usage

### Basic Testing
Test all analytics endpoints for a specific event:
```bash
tsx scripts/test-analytics-api.ts --event evt_residency_2024 --test-all
```

### Individual Endpoint Testing
Test specific endpoints:
```bash
# Text corpus for Broad Listening
tsx scripts/test-analytics-api.ts --event evt_123 --endpoint text-corpus

# Demographics breakdown
tsx scripts/test-analytics-api.ts --event evt_123 --endpoint demographics

# Skills analysis
tsx scripts/test-analytics-api.ts --event evt_123 --endpoint skills
```

### Security Validation
Run comprehensive security tests:
```bash
tsx scripts/test-analytics-api.ts --event evt_123 --validate-security --export
```

### Performance Testing
Test with custom parameters:
```bash
tsx scripts/test-analytics-api.ts --event evt_123 --retries 5 --delay 2000 --export
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--event <id>` | Event ID to test against (required) | - |
| `--user <id>` | User ID for testing | Current user |
| `--test-all` | Run all tests including security validation | false |
| `--validate-security` | Run security validation tests | false |
| `--export` | Export results to JSON file | false |
| `--retries <n>` | Max retries for failed requests | 3 |
| `--delay <ms>` | Delay between requests (respect rate limits) | 1000 |
| `--log-level <level>` | Log level: info\|debug\|error | info |

## Expected Test Results

### Successful Output Example
```
🔬 Starting Analytics API Testing Suite
=====================================

🔧 Validating Environment Setup
✅ Database connection: OK
✅ ANONYMIZATION_SECRET: Configured
✅ Event "FtC Residency 2024": Found
✅ Applications: 47 found

📝 Testing Application Text Corpus Endpoint
Rate Limit: 5 requests/hour, 60min block
✅ Success: 47 applications, 3 question types
📊 Response size: 15.2KB in 245ms

👥 Testing Demographics Breakdown Endpoint
Rate Limit: 20 requests/hour, 15min block
✅ Success: 47 participants analyzed
👨‍👩‍👧‍👦 Gender: 38% female, 60% male
🌎 Region: 53% LATAM, 45% non-LATAM
💼 Experience: 28% junior, 49% mid, 23% senior

📋 Test Results Summary
======================
Overall Success Rate: 5/5 (100%)
Total Response Time: 1,247ms
Total Data Size: 67KB
```

### Rate Limiting Example
```
📝 Testing Application Text Corpus Endpoint
🚫 Rate limit exceeded - demonstrating rate limiting

⏰ Rate Limit Handling Example:
if (error.code === "TOO_MANY_REQUESTS") {
  const retryAfter = error.data?.retryAfter || 3600;
  console.log(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
  // Implement exponential backoff or queue requests
}
```

### Security Validation Output
```
🔒 Validating Security Features
===============================
1. Testing anonymization consistency...
2. Testing PII detection...
3. Testing aggregation thresholds...
4. Testing rate limiting...
✅ Security validation complete
```

## Integration Examples

The testing script demonstrates real-world integration patterns:

### David's Broad Listening Tool
```typescript
🎯 Broad Listening Integration Example:
// Process with David's Broad Listening tool
const insights = await broadListeningAnalysis({
  corpus: response.questionTypes,
  eventContext: "EVT_abc123",
  sanitizationLevel: "standard"
});
const themes = extractThemes(insights);
const sentiment = analyzeSentiment(insights);
```

### Demographics Dashboard
```typescript
📊 Dashboard Integration Example:
// Update demographics dashboard
updateGenderChart(response.gender);
updateRegionChart(response.region);
updateExperienceChart(response.experience);
```

### Skills Analysis
```typescript
🔍 Skills Analysis Example:
// Identify trending technologies
Frontend frameworks: 4 different frameworks represented
Blockchain skills: 3 Web3 technologies
```

## Rate Limits by Endpoint

| Endpoint | Requests/Hour | Block Duration | Purpose |
|----------|---------------|----------------|---------|
| Text Corpus | 5 | 60 minutes | Most sensitive - bulk text data |
| Demographics | 20 | 15 minutes | Aggregated statistics |
| Skills Word Cloud | 20 | 15 minutes | Skills frequency data |
| Application Timeline | 15 | 30 minutes | Temporal patterns |
| Review Metrics | 10 | 30 minutes | Evaluation statistics |

## Troubleshooting

### Common Issues

**"Access denied - check user role"**
- Ensure your user account has `researcher`, `staff`, or `admin` role
- Contact administrator to assign appropriate role

**"Insufficient data for analysis"**
- Event needs minimum 5 applications with submitted status
- Check that applications have responses to the questions being queried

**"ANONYMIZATION_SECRET environment variable is required"**
- Add the secret to your environment configuration
- Contact administrator for the correct value

**"Rate limit exceeded"**
- Wait for the block duration to expire
- Implement proper delay between requests
- Use the `--delay` option to increase request spacing

### Database Issues

**"Event not found"**
- Verify the event ID exists in the database
- Use `tsx scripts/test-analytics-api.ts` without arguments to see usage help

**"Database connection failed"**
- Check `DATABASE_URL` environment variable
- Ensure PostgreSQL is running and accessible

## Security Considerations

### Data Protection
- All participant data is anonymized with synthetic IDs
- PII is automatically removed from text responses
- Minimum aggregation thresholds prevent individual identification
- Complete audit trail logs all access

### Best Practices
- Cache results locally to minimize API calls
- Respect rate limits and implement proper retry logic
- Use appropriate sanitization levels for your use case
- Monitor for potential PII leakage in responses

### Audit Trail
Every test run is logged with:
- User ID and role
- Endpoints accessed and parameters
- Data volume and response characteristics
- Timestamp and source information

## Export and Analysis

### JSON Export Format
When using `--export`, results are saved with this structure:
```json
{
  "config": {
    "eventId": "evt_123",
    "validateSecurity": true,
    "exportResults": true
  },
  "results": [
    {
      "endpoint": "getApplicationTextCorpus",
      "success": true,
      "responseTime": 245,
      "dataSize": 15360,
      "participantCount": 47,
      "securityIssues": []
    }
  ],
  "summary": {
    "successRate": 1.0,
    "totalResponseTime": 1247,
    "totalDataSize": 67584
  }
}
```

This testing framework ensures the analytics system functions correctly while maintaining the highest standards of privacy protection and data security.