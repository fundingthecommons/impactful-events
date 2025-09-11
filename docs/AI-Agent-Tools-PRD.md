# Product Requirements Document: AI Agent Tools for Application Ranking

## Executive Summary

This document outlines the requirements for implementing AI Agent tools that will integrate with the FtC Platform API to automatically rank residency applications using established evaluation criteria. The AI agent will retrieve application data, apply scoring logic based on human evaluator patterns, and generate ranked lists to assist in the selection process.

## Background

The Funding the Commons Residency program receives numerous applications that require evaluation across multiple criteria. Currently, human evaluators manually score applications across 12 different criteria organized into 4 categories (Technical, Project, Community Fit, Video). This process is time-intensive and requires consistent application of evaluation standards.

The AI agent will supplement human evaluation by providing data-driven rankings based on:
- Historical human evaluation patterns
- Established criteria and weights
- Application content analysis
- Consistency with program objectives

## API Integration Details

### Base Configuration
- **Base URL**: `https://your-app-domain.com/api/mastra/`
- **Authentication**: Bearer token authentication
- **API Key**: `ftc_18ac775609cb05d655716cc1016dbc29886dbda2aa439d4b134450c42b30654f` (stored securely in agent environment)
- **Content Type**: `application/json`

### Available Endpoints

#### 1. Get Applications
**Endpoint**: `GET /events/{eventId}/applications`
**Purpose**: Retrieve all submitted applications for a specific event

**Response Structure**:
```json
{
  "success": true,
  "data": {
    "eventId": "funding-commons-residency-2025",
    "applications": [
      {
        "id": "application-id",
        "userId": "user-id",
        "status": "SUBMITTED",
        "submittedAt": "2025-08-24T16:09:33.378Z",
        "applicant": {
          "name": "John Doe",
          "email": "john@example.com"
        },
        "responses": [
          {
            "questionKey": "technical_experience",
            "questionText": "Describe your technical experience",
            "answer": "I have 5 years of experience...",
            "order": 1
          }
        ]
      }
    ],
    "totalCount": 45
  }
}
```

#### 2. Get Application Questions
**Endpoint**: `GET /events/{eventId}/questions`
**Purpose**: Retrieve the application form structure to understand question context

**Response Structure**:
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "questionKey": "technical_experience",
        "questionText": {
          "en": "Describe your technical experience"
        },
        "questionType": "TEXTAREA",
        "required": true,
        "order": 1
      }
    ]
  }
}
```

#### 3. Get Evaluation Criteria
**Endpoint**: `GET /events/{eventId}/criteria`
**Purpose**: Retrieve scoring criteria, weights, and categories for evaluation

**Response Structure**:
```json
{
  "success": true,
  "data": {
    "criteria": [
      {
        "id": "technical-skills",
        "name": "Technical Skills Assessment",
        "description": "Evaluate technical capabilities...",
        "category": "TECHNICAL",
        "weight": 0.12,
        "scoreRange": { "min": 1, "max": 10 },
        "scoringGuidance": "Score from 1 to 10, where 1 is poor and 10 is excellent"
      }
    ],
    "categorizedCriteria": {
      "TECHNICAL": [...],
      "PROJECT": [...],
      "COMMUNITY_FIT": [...],
      "VIDEO": [...]
    },
    "scoring": {
      "totalMaxScore": 120,
      "weightedMaxScore": 10.0,
      "categoryWeights": {
        "TECHNICAL": 0.30,
        "PROJECT": 0.25,
        "COMMUNITY_FIT": 0.25,
        "VIDEO": 0.20
      }
    }
  }
}
```

#### 4. Get Historical Evaluations
**Endpoint**: `GET /events/{eventId}/evaluations`
**Purpose**: Retrieve existing human evaluations to understand scoring patterns

**Response Structure**:
```json
{
  "success": true,
  "data": {
    "evaluations": [
      {
        "applicationId": "app-id",
        "overallScore": 7.8,
        "recommendation": "ACCEPT",
        "confidence": 8,
        "scores": [
          {
            "criteriaName": "Technical Skills Assessment",
            "score": 8,
            "normalizedScore": 0.78,
            "reasoning": "Strong portfolio and GitHub activity"
          }
        ],
        "metrics": {
          "averageScore": 7.5,
          "categoryScores": {
            "TECHNICAL": [8, 7, 9],
            "PROJECT": [6, 8, 7]
          }
        }
      }
    ],
    "statistics": {
      "totalEvaluations": 23,
      "recommendations": {
        "ACCEPT": 8,
        "REJECT": 12,
        "WAITLIST": 3
      },
      "averageOverallScore": 6.2
    }
  }
}
```

## Functional Requirements

### Core Tool Functions

#### 1. Data Retrieval Tool
**Function Name**: `get_application_data`
**Parameters**: 
- `event_id` (required): Event identifier
- `include_historical` (optional): Whether to include past evaluations

**Behavior**:
- Fetch all applications for the specified event
- Retrieve application form structure for context
- Get evaluation criteria and weights
- Optionally include historical evaluation data
- Combine data into a structured format for analysis

#### 2. Application Analysis Tool
**Function Name**: `analyze_applications`
**Parameters**:
- `applications_data`: Raw application data from retrieval tool
- `criteria_data`: Evaluation criteria and weights
- `historical_data`: Past evaluations for pattern learning

**Behavior**:
- Parse application responses against question structure
- Extract key information for each criterion
- Apply natural language processing to understand content quality
- Identify technical skills, project feasibility, community fit indicators
- Generate preliminary scores for each criterion

#### 3. Ranking Generation Tool
**Function Name**: `generate_rankings`
**Parameters**:
- `analyzed_applications`: Processed application data with scores
- `ranking_strategy`: "conservative", "balanced", or "aggressive"
- `min_threshold_score`: Minimum score for consideration

**Behavior**:
- Apply weighted scoring based on established criteria
- Generate normalized scores (0-1 scale) for comparison
- Rank applications by overall weighted score
- Provide confidence intervals for rankings
- Generate recommendation categories (ACCEPT/WAITLIST/REJECT)

#### 4. Report Generation Tool  
**Function Name**: `generate_evaluation_report`
**Parameters**:
- `ranked_applications`: Applications with scores and rankings
- `summary_level`: "brief", "detailed", or "comprehensive"

**Behavior**:
- Create structured evaluation report
- Include individual application summaries
- Provide ranking rationale for each application
- Generate aggregate statistics and insights
- Format output for human review

## Technical Requirements

### Authentication Implementation
```javascript
const headers = {
  'Authorization': `Bearer ${process.env.MASTRA_API_KEY}`,
  'Content-Type': 'application/json'
};
```

### Error Handling
- Implement retry logic for network failures (3 attempts with exponential backoff)
- Handle rate limiting gracefully (respect 429 responses)
- Validate API responses and handle malformed data
- Log all API interactions for debugging

### Data Processing Requirements
- Support batch processing for large application sets (>100 applications)
- Implement caching for criteria and question data (static per event)
- Normalize text data (encoding, whitespace, formatting)
- Handle missing or incomplete application responses

### Performance Requirements
- Complete full application ranking within 5 minutes for 100 applications
- Cache API responses to minimize redundant requests
- Support parallel processing where possible
- Provide progress indicators for long-running operations

## Scoring Logic Specifications

### Category Weighting (Based on Current Criteria)
- **Technical**: 30% (Skills, Open Source Experience, Learning Ability)
- **Project**: 25% (Vision, Public Goods Alignment, Impact Potential)
- **Community Fit**: 25% (Ecosystem Understanding, Contribution Potential, Commitment)
- **Video**: 20% (Communication, Authenticity, Professionalism)

### Scoring Algorithm
1. **Text Analysis**: Use NLP to evaluate response quality, depth, and relevance
2. **Keyword Matching**: Identify relevant technical skills, experience markers, and domain knowledge
3. **Pattern Recognition**: Compare against high-scoring historical evaluations
4. **Consistency Checking**: Flag responses that seem inconsistent or generic
5. **Length/Detail Analysis**: Consider response thoroughness within reasonable bounds

### Recommendation Thresholds
- **ACCEPT**: Overall score ≥ 7.0 (top 15-20% expected)
- **WAITLIST**: Overall score 5.5-6.9 (middle tier, conditional acceptance)
- **REJECT**: Overall score < 5.5 (bottom 60-70%)

## Data Flow

### Typical Workflow
1. **Initialize**: Configure API credentials and event parameters
2. **Retrieve Data**: Fetch applications, questions, criteria, and historical evaluations
3. **Process Applications**: Analyze each application against criteria
4. **Generate Scores**: Calculate weighted scores for all criteria
5. **Rank Applications**: Sort by overall score and assign recommendations
6. **Generate Report**: Create human-readable evaluation summary
7. **Output Results**: Return structured data for human review

### Input/Output Formats

#### Tool Input Format
```json
{
  "event_id": "funding-commons-residency-2025",
  "options": {
    "include_historical": true,
    "ranking_strategy": "balanced",
    "min_threshold_score": 4.0,
    "output_format": "detailed"
  }
}
```

#### Tool Output Format
```json
{
  "success": true,
  "rankings": [
    {
      "rank": 1,
      "applicationId": "app-123",
      "applicantName": "John Doe",
      "overallScore": 8.2,
      "recommendation": "ACCEPT",
      "confidence": 0.85,
      "categoryScores": {
        "TECHNICAL": 8.5,
        "PROJECT": 7.8,
        "COMMUNITY_FIT": 8.0,
        "VIDEO": 8.5
      },
      "strengths": ["Strong technical background", "Clear project vision"],
      "concerns": ["Limited open source experience"],
      "reasoning": "Exceptional technical skills with innovative project proposal..."
    }
  ],
  "summary": {
    "totalApplications": 45,
    "recommended": {
      "ACCEPT": 8,
      "WAITLIST": 15,
      "REJECT": 22
    },
    "averageScore": 6.1,
    "processingTime": "2m 34s"
  }
}
```

## Validation Requirements

### Data Validation
- Verify all required API responses are received
- Validate score ranges (1-10 for individual criteria, 0-10 for overall)
- Check for missing critical application data
- Ensure all applications have minimum required responses

### Quality Assurance
- Compare AI rankings against historical human evaluations (if available)
- Flag applications with unusual scoring patterns for human review
- Implement sanity checks (e.g., no all-10s or all-1s scoring)
- Provide confidence metrics for each ranking decision

## Security Considerations

### API Key Management
- Store API key in secure environment variables
- Never log API keys or include in error messages
- Implement key rotation capability
- Use HTTPS for all API communications

### Data Handling
- Process application data in memory only (no persistent storage)
- Implement data anonymization for logs
- Respect applicant privacy in all outputs
- Clear sensitive data after processing completion

## Success Criteria

### Primary Goals
- Successfully retrieve and process application data via API
- Generate consistent, explainable rankings based on established criteria
- Provide ranking results within acceptable time limits
- Maintain high correlation with human evaluator patterns (>0.75 correlation coefficient)

### Acceptance Criteria
- [ ] All four API endpoints integrate successfully
- [ ] Ranking algorithm processes 100+ applications without errors
- [ ] Generated rankings include clear reasoning for each decision
- [ ] System handles missing data gracefully
- [ ] Output format matches specification requirements
- [ ] Performance meets stated time requirements

## Implementation Notes

### Development Environment
- Use event ID `funding-commons-residency-2025` for testing
- API base URL for development: `http://localhost:3000/api/mastra/`
- Production URL to be provided separately

### Testing Strategy
- Unit tests for each tool function
- Integration tests with actual API endpoints
- Performance testing with realistic data volumes
- Validation testing against known evaluation results

### Documentation Requirements
- Comprehensive tool documentation with examples
- API integration guide
- Troubleshooting guide for common issues
- Configuration reference for all parameters

---

**Document Version**: 1.0  
**Last Updated**: September 11, 2025  
**Author**: FtC Platform Team  
**Review Status**: Ready for Development