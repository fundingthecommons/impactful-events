# FtC Platform Analytics System

## Overview

The FtC Platform Analytics System provides secure, privacy-first access to anonymized application and review data for researchers and platform stakeholders. Built specifically to support research initiatives like David Dao's Broad Listening tool while maintaining the highest standards of data protection.

## 📖 Documentation

### 🏗️ **System Architecture & Features**
**[Analytics System Overview](features/analytics-system.md)**
- Complete system architecture and database schema
- Privacy-first design with comprehensive PII protection
- Rate limiting and access control mechanisms
- Integration points for research tools
- Environment requirements and configuration

### 🔌 **API Integration**
**[Analytics API Reference](api/analytics-endpoints.md)**
- Complete documentation for all 5 analytics endpoints
- TypeScript schemas and usage examples
- Rate limiting details by endpoint
- Error handling and response formats
- Real-world integration patterns

### 🔒 **Security & Privacy**
**[Privacy & Security Documentation](security/analytics-privacy.md)**
- Comprehensive privacy protection layers
- PII removal patterns and anonymization methods
- Cryptographic security guarantees
- Compliance guidelines and audit procedures
- Research ethics and incident response

### 🧪 **Testing & Validation**
**[Analytics Testing Guide](testing/analytics-testing-guide.md)**
- Step-by-step testing procedures
- Command-line usage examples
- Troubleshooting common issues
- Security validation methods

## 🚀 Quick Start Guide

### 1. **Get Access**
1. Create an account on the FtC Platform
2. Contact an administrator to request `researcher` role
3. Administrator assigns role: `researcher`, `staff`, or `admin`

### 2. **Environment Setup**
Generate and configure the required secret:
```bash
# Generate secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to your environment
ANONYMIZATION_SECRET=your-generated-secret-here
```

### 3. **Test the APIs**
```bash
# Test all analytics endpoints
tsx scripts/test-analytics-api.ts --event evt_your_event_id --test-all

# Run security validation
tsx scripts/test-analytics-api.ts --event evt_123 --validate-security --export
```

### 4. **Start Using Analytics**
```typescript
// Example: Get sanitized text for analysis
const corpus = await api.analytics.getApplicationTextCorpus.query({
  eventId: "evt_residency_2024",
  questionKeys: ["why_apply", "technical_background"],
  sanitizationLevel: "standard"
});

// Example: Get demographics breakdown
const demographics = await api.analytics.getDemographicsBreakdown.query({
  eventId: "evt_residency_2024",
  status: "ACCEPTED"
});
```

## 📊 Available Data

### **1. Application Text Corpus** (Most Restricted)
- **Purpose**: Sanitized text for Broad Listening analysis
- **Rate Limit**: 5 requests/hour, 60-minute block
- **Data**: PII-removed application responses grouped by question
- **Use Case**: Natural language processing, theme extraction

### **2. Demographics Breakdown**
- **Purpose**: Population statistics and diversity analysis
- **Rate Limit**: 20 requests/hour, 15-minute block
- **Data**: Gender, region (LATAM/non-LATAM), experience level
- **Use Case**: Diversity dashboards, demographic reporting

### **3. Skills Word Cloud**
- **Purpose**: Technology trends and skills frequency
- **Rate Limit**: 20 requests/hour, 15-minute block
- **Data**: Skills with occurrence counts and percentages
- **Use Case**: Technology trend analysis, curriculum planning

### **4. Application Timeline**
- **Purpose**: Submission patterns and temporal analysis
- **Rate Limit**: 15 requests/hour, 30-minute block
- **Data**: Submission counts over time with status breakdowns
- **Use Case**: Process optimization, deadline analysis

### **5. Review Metrics** (Most Sensitive)
- **Purpose**: Anonymized reviewer activity statistics
- **Rate Limit**: 10 requests/hour, 30-minute block
- **Data**: Review times, score distributions, recommendations
- **Use Case**: Review process improvement, workload analysis

## 🔐 Privacy Guarantees

### **Individual Protection**
- **Minimum Aggregation**: No data for groups under 5 participants
- **Synthetic IDs**: Cryptographically anonymized, irreversible identifiers
- **PII Sanitization**: Automatic removal of names, emails, addresses, phones
- **No Individual Records**: Only aggregated statistics available

### **Data Security**
- **Access Control**: Role-based permissions (researcher/staff/admin)
- **Rate Limiting**: Endpoint-specific limits prevent abuse
- **Audit Logging**: Complete tracking of all data access
- **Environment Security**: Required cryptographic secrets

## 🔗 Integration Examples

### **David's Broad Listening Tool**
```typescript
// Real-world integration pattern
const textData = await api.analytics.getApplicationTextCorpus.query({
  eventId: currentEvent,
  questionKeys: ["motivation", "technical_background"],
  sanitizationLevel: "standard"
});

const insights = await broadListeningAnalysis(textData.questionTypes);
const themes = extractThemes(insights);
```

### **Demographics Dashboard**
```typescript
// Dashboard visualization
const demographics = await api.analytics.getDemographicsBreakdown.query({
  eventId: activeEvent,
  status: "SUBMITTED"
});

updateGenderChart(demographics.gender);
updateRegionChart(demographics.region);
updateExperienceChart(demographics.experience);
```

### **Skills Trend Analysis**
```typescript
// Technology trend monitoring
const currentSkills = await api.analytics.getSkillsWordCloud.query({
  eventId: currentEvent,
  minOccurrences: 2
});

const trendAnalysis = analyzeSkillsTrends(currentSkills.skills);
```

## 🛠️ Tools & Scripts

### **Testing Script**
- **Location**: `scripts/test-analytics-api.ts`
- **Purpose**: Comprehensive testing and integration examples
- **Features**: All endpoint testing, security validation, performance monitoring

### **Usage Examples**
```bash
# Complete testing suite
tsx scripts/test-analytics-api.ts --event evt_123 --test-all --export

# Security validation only
tsx scripts/test-analytics-api.ts --event evt_123 --validate-security

# Individual endpoint testing
tsx scripts/test-analytics-api.ts --event evt_123 --endpoint demographics
```

## 📋 Support & Resources

### **Getting Help**
- **Technical Issues**: Contact platform administrators
- **Research Collaboration**: Coordinate with research team leads
- **Access Requests**: Submit through admin channels
- **Rate Limit Adjustments**: Contact system administrators

### **Best Practices**
- **Cache Results**: Store analytics data locally to minimize API calls
- **Respect Rate Limits**: Implement proper delays between requests
- **Validate Data**: Check for potential PII leakage in responses
- **Monitor Usage**: Review audit logs for access patterns

### **Compliance**
- **Data Export**: Follow institutional data sharing policies
- **Research Ethics**: Acknowledge data source and privacy protections
- **Attribution**: Credit anonymization and aggregation in publications
- **Storage**: Implement secure local storage for cached results

## 🏃‍♂️ Next Steps

1. **Read the Documentation**: Start with [Analytics System Overview](features/analytics-system.md)
2. **Set Up Environment**: Generate `ANONYMIZATION_SECRET` and configure access
3. **Test the APIs**: Use the [testing script](testing/analytics-testing-guide.md) to validate setup
4. **Integrate**: Follow [API Reference](api/analytics-endpoints.md) for your specific use case
5. **Monitor**: Review audit logs and respect rate limiting

The FtC Platform Analytics System balances powerful research capabilities with rigorous privacy protection, enabling valuable insights while maintaining participant confidentiality and data security.

---

**Documentation Version**: 1.0  
**Last Updated**: October 2025  
**Contact**: Platform Administration Team