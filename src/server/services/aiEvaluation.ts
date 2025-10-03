import OpenAI from 'openai';

// Types for AI evaluation
export interface ConfidenceFactors {
  dataCompleteness: number; // 0-100
  consistencyScore: number; // 0-100  
  specificityLevel: number; // 0-100
  externalValidation: number; // 0-100
  overallConfidence: number; // Weighted average
}

export interface CriteriaScore {
  criteriaId: string;
  score: number; // 1-10
  reasoning: string;
  confidence: number; // 1-5
  dataQuality: 'excellent' | 'good' | 'limited' | 'insufficient';
}

export interface EntrepreneurialAssessment {
  score: number; // 1-10
  reasoning: string;
  keyStrengths: string[];
  developmentAreas: string[];
}

export interface AutoScoreResponse {
  scores: CriteriaScore[];
  overallComments: string;
  recommendation: 'ACCEPT' | 'REJECT' | 'WAITLIST' | 'NEEDS_MORE_INFO';
  confidence: number; // 1-5
  confidenceFactors: ConfidenceFactors;
  entrepreneurialAssessment: EntrepreneurialAssessment;
}

export interface ApplicationData {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  event: {
    name: string;
  } | null;
  responses: Array<{
    answer: string;
    question: {
      questionKey: string;
      questionEn: string;
      order: number;
    };
  }>;
}

export interface EvaluationCriteria {
  id: string;
  name: string;
  description: string;
  category: string;
  weight: number;
  order: number;
}

export interface EvaluationInput {
  application: ApplicationData;
  criteria: EvaluationCriteria[];
  stage: string;
}

export class AIEvaluationService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey,
    });
  }

  async evaluateApplication(input: EvaluationInput): Promise<AutoScoreResponse> {
    const { application, criteria, stage } = input;
    
    // Log input data for debugging
    console.log('🤖 AI Evaluation Input:', {
      applicationId: application.id,
      userId: application.user?.id,
      stage,
      criteriaCount: criteria.length,
      responsesCount: application.responses.length,
      hasUser: !!application.user,
      userName: application.user?.name,
      userEmail: application.user?.email,
    });
    
    // Log sample of application responses for debugging
    console.log('📋 Application Responses Sample:', 
      application.responses.slice(0, 3).map(r => ({
        questionKey: r.question.questionKey,
        questionText: r.question.questionEn?.slice(0, 100) + '...',
        responseLength: r.answer?.length ?? 0,
        hasResponse: !!r.answer,
        answerPreview: r.answer?.slice(0, 50) + '...'
      }))
    );
    
    // Build structured prompt
    const prompt = this.buildEvaluationPrompt(application, criteria, stage);
    
    // Log prompt length and sample for debugging
    console.log('📝 AI Prompt Stats:', {
      promptLength: prompt.length,
      promptPreview: prompt.slice(0, 500) + '...'
    });
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o", // Using GPT-4 Omni for better reasoning
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt()
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent evaluation
        max_tokens: 4000,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from AI service');
      }

      // Log AI response for debugging
      console.log('🤖 AI Raw Response:', {
        length: responseContent.length,
        preview: responseContent.slice(0, 300) + '...',
        hasCodeBlocks: responseContent.includes('```'),
        startsWithJson: responseContent.trim().startsWith('{'),
      });

      // Clean and parse the JSON response
      // Remove markdown code blocks if present
      let cleanContent = responseContent.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log('🧹 Cleaned Content:', {
        length: cleanContent.length,
        preview: cleanContent.slice(0, 300) + '...',
        startsWithBrace: cleanContent.startsWith('{'),
      });
      
      const aiResponse = JSON.parse(cleanContent) as unknown;
      
      console.log("✅ Parsed AI Response:", {
        parsedSuccessfully: this.isValidAIResponse(aiResponse),
      });
      const result = this.validateAndTransformResponse(aiResponse, criteria);
      
      console.log('🎯 Final AutoScore Result:', {
        scoresCount: result.scores.length,
        overallCommentsLength: result.overallComments.length,
        recommendation: result.recommendation,
        confidence: result.confidence,
      });
      
      return result;
      
    } catch (error) {
      console.error('AI Evaluation Error:', error);
      throw new Error(`AI evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert evaluator for the Funding the Commons Residency program, a prestigious 12-week technology residency focused on public goods funding, RealFi (Real World Finance), and crypto/blockchain innovations.

Your role is to assess applicants based on their:
1. Technical capabilities and experience
2. Project vision and feasibility  
3. Community fit and values alignment
4. Communication and presentation skills
5. **Entrepreneurial potential and business mindset**

Key evaluation principles:
- Focus on entrepreneur material: leadership, execution track record, business acumen
- Assess evidence quality: concrete examples vs vague claims
- Look for consistency across different responses
- Consider social proof and external validation (GitHub, LinkedIn, Twitter)
- Evaluate potential for innovation and calculated risk-taking
- Prioritize authentic passion over scripted responses

You must return ONLY a valid JSON object with the exact structure specified in the user prompt. Do not include any markdown formatting, code blocks, or additional text - just the raw JSON.`;
  }

  private buildEvaluationPrompt(
    application: ApplicationData, 
    criteria: EvaluationCriteria[], 
    stage: string
  ): string {
    // Extract responses into a readable format
    const responses = application.responses.reduce((acc, response) => {
      acc[response.question.questionKey] = response.answer;
      return acc;
    }, {} as Record<string, string>);

    return `
# Application Evaluation Request

## Applicant Information
- **Name**: ${application.user?.name ?? 'Not provided'}
- **Email**: ${application.user?.email ?? 'Not provided'}
- **Program**: ${application.event?.name ?? 'Unknown'}
- **Stage**: ${stage}

## Application Responses
${Object.entries(responses).map(([key, answer]) => `
### ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
${answer ?? 'Not provided'}
`).join('\n')}

## Evaluation Criteria
${criteria.map((c, index) => `
**${index + 1}. ${c.name}** (${c.category}, Weight: ${(c.weight * 100).toFixed(1)}%)
${c.description}
`).join('\n')}

## Required Response Format

You must respond with ONLY the raw JSON object matching this exact structure (no markdown, no code blocks, no additional text):

{
  "scores": [
    {
      "criteriaId": "criteria-id-here",
      "score": 7,
      "reasoning": "Detailed reasoning for the score based on evidence from application",
      "confidence": 4,
      "dataQuality": "good"
    }
  ],
  "overallComments": "Comprehensive evaluation summary highlighting key strengths and concerns",
  "recommendation": "ACCEPT",
  "confidence": 4,
  "confidenceFactors": {
    "dataCompleteness": 85,
    "consistencyScore": 90,
    "specificityLevel": 75,
    "externalValidation": 70,
    "overallConfidence": 80
  },
  "entrepreneurialAssessment": {
    "score": 8,
    "reasoning": "Assessment of entrepreneurial potential based on leadership, execution, business acumen",
    "keyStrengths": ["Leadership experience", "Track record of execution"],
    "developmentAreas": ["Market analysis", "Risk assessment"]
  }
}

## Scoring Guidelines

**Score Range**: 1-10 for each criterion
- 1-3: Poor/Concerning - Significant gaps or red flags
- 4-5: Below Average - Meets minimum requirements but has limitations  
- 6-7: Good - Solid candidate with good potential
- 8-9: Excellent - Strong candidate who exceeds expectations
- 10: Outstanding - Exceptional candidate, top 5% of applicants

**Confidence Levels**: 1-5
- 1: Very Low - Insufficient data to make reliable assessment
- 2: Low - Limited data, high uncertainty
- 3: Medium - Adequate data for basic assessment
- 4: High - Good data quality, confident in assessment
- 5: Very High - Excellent data, very confident in assessment

**Data Quality Assessment**:
- excellent: Rich details, specific examples, strong evidence
- good: Adequate details, some examples, reasonable evidence  
- limited: Basic information, few examples, weak evidence
- insufficient: Minimal information, no examples, no evidence

**Recommendation Guidelines**:
- ACCEPT: Strong fit, likely to succeed and contribute significantly
- WAITLIST: Good potential but some concerns or missing information
- NEEDS_MORE_INFO: Promising but requires additional information/clarification
- REJECT: Poor fit, significant concerns, or insufficient qualifications

Evaluate thoroughly and provide specific, evidence-based reasoning for all scores and recommendations.
`;
  }

  private validateAndTransformResponse(
    aiResponse: unknown, 
    criteria: EvaluationCriteria[]
  ): AutoScoreResponse {
    // Type guard for AI response
    if (!this.isValidAIResponse(aiResponse)) {
      throw new Error('Invalid AI response structure');
    }

    // Validate each score
    const validatedScores: CriteriaScore[] = [];
    for (const criterion of criteria) {
      const scoreData = aiResponse.scores.find((s: unknown) => 
        this.isScoreData(s) && s.criteriaId === criterion.id
      );
      if (!scoreData) {
        // If AI didn't provide a score for this criterion, create a default one
        validatedScores.push({
          criteriaId: criterion.id,
          score: 5, // Default middle score
          reasoning: 'Insufficient information provided for evaluation',
          confidence: 1,
          dataQuality: 'insufficient'
        });
      } else {
        // Validate the score data
        const scoreDataRecord = scoreData as Record<string, unknown>;
        validatedScores.push({
          criteriaId: criterion.id,
          score: Math.max(1, Math.min(10, Math.round(this.getNumericValue(scoreDataRecord.score, 5)))),
          reasoning: this.getStringValue(scoreDataRecord.reasoning, 'No reasoning provided'),
          confidence: Math.max(1, Math.min(5, Math.round(this.getNumericValue(scoreDataRecord.confidence, 3)))),
          dataQuality: this.isValidDataQuality(scoreDataRecord.dataQuality) 
            ? scoreDataRecord.dataQuality 
            : 'limited'
        });
      }
    }

    // Calculate confidence factors if not provided or invalid
    const confidenceFactors: ConfidenceFactors = {
      dataCompleteness: Math.max(0, Math.min(100, aiResponse.confidenceFactors?.dataCompleteness ?? 50)),
      consistencyScore: Math.max(0, Math.min(100, aiResponse.confidenceFactors?.consistencyScore ?? 50)),
      specificityLevel: Math.max(0, Math.min(100, aiResponse.confidenceFactors?.specificityLevel ?? 50)),
      externalValidation: Math.max(0, Math.min(100, aiResponse.confidenceFactors?.externalValidation ?? 50)),
      overallConfidence: 0 // Will be calculated
    };

    // Calculate overall confidence as weighted average
    confidenceFactors.overallConfidence = Math.round(
      (confidenceFactors.dataCompleteness * 0.4) +
      (confidenceFactors.consistencyScore * 0.25) +
      (confidenceFactors.specificityLevel * 0.2) +
      (confidenceFactors.externalValidation * 0.15)
    );

    // Validate entrepreneurial assessment
    const entrepreneurialAssessment: EntrepreneurialAssessment = {
      score: Math.max(1, Math.min(10, Math.round(aiResponse.entrepreneurialAssessment?.score ?? 5))),
      reasoning: aiResponse.entrepreneurialAssessment?.reasoning ?? 'Basic entrepreneurial assessment completed',
      keyStrengths: Array.isArray(aiResponse.entrepreneurialAssessment?.keyStrengths) 
        ? (aiResponse.entrepreneurialAssessment.keyStrengths as string[]).slice(0, 5) // Limit to 5 items
        : ['Assessment pending'],
      developmentAreas: Array.isArray(aiResponse.entrepreneurialAssessment?.developmentAreas)
        ? (aiResponse.entrepreneurialAssessment.developmentAreas as string[]).slice(0, 5) // Limit to 5 items  
        : ['Further evaluation needed']
    };

    return {
      scores: validatedScores,
      overallComments: aiResponse.overallComments,
      recommendation: aiResponse.recommendation as 'ACCEPT' | 'REJECT' | 'WAITLIST' | 'NEEDS_MORE_INFO',
      confidence: Math.max(1, Math.min(5, Math.round(aiResponse.confidence ?? 3))),
      confidenceFactors,
      entrepreneurialAssessment
    };
  }

  // Type guards for validation
  private isValidAIResponse(response: unknown): response is {
    scores: unknown[];
    overallComments: string;
    recommendation: string;
    confidence?: number;
    confidenceFactors?: {
      dataCompleteness?: number;
      consistencyScore?: number;
      specificityLevel?: number;
      externalValidation?: number;
    };
    entrepreneurialAssessment?: {
      score?: number;
      reasoning?: string;
      keyStrengths?: unknown;
      developmentAreas?: unknown;
    };
  } {
    return (
      typeof response === 'object' &&
      response !== null &&
      'scores' in response &&
      Array.isArray((response as Record<string, unknown>).scores) &&
      'overallComments' in response &&
      typeof (response as Record<string, unknown>).overallComments === 'string' &&
      'recommendation' in response &&
      typeof (response as Record<string, unknown>).recommendation === 'string' &&
      ['ACCEPT', 'REJECT', 'WAITLIST', 'NEEDS_MORE_INFO'].includes((response as Record<string, unknown>).recommendation as string)
    );
  }

  private isScoreData(data: unknown): data is {
    criteriaId: string;
    score?: number;
    reasoning?: string;
    confidence?: number;
    dataQuality?: string;
  } {
    return (
      typeof data === 'object' &&
      data !== null &&
      'criteriaId' in data &&
      typeof (data as Record<string, unknown>).criteriaId === 'string'
    );
  }

  private getNumericValue(value: unknown, defaultValue: number): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
  }

  private getStringValue(value: unknown, defaultValue: string): string {
    return typeof value === 'string' ? value : defaultValue;
  }

  private isValidDataQuality(quality: unknown): quality is 'excellent' | 'good' | 'limited' | 'insufficient' {
    return typeof quality === 'string' && ['excellent', 'good', 'limited', 'insufficient'].includes(quality);
  }
}

// Export service instance getter
export function getAIEvaluationService(): AIEvaluationService {
  return new AIEvaluationService();
}