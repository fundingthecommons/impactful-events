/**
 * Utilities for calculating confidence-weighted scores in the evaluation system
 */

export interface ReviewerScore {
  reviewerId: string;
  reviewerName: string | null;
  reviewerEmail: string | null;
  reviewerImage: string | null;
  overallScore: number;
  confidence: number;
  recommendation: 'ACCEPT' | 'REJECT' | 'WAITLIST' | 'NEEDS_MORE_INFO';
  completedAt: Date | null;
}

export interface WeightedReviewerScore extends ReviewerScore {
  weightedScore: number;
  confidenceWeight: number;
}

/**
 * Calculate confidence weight using linear weighting
 * Confidence 5/5 = 1.0, 4/5 = 0.8, 3/5 = 0.6, 2/5 = 0.4, 1/5 = 0.2
 */
export function calculateConfidenceWeight(confidence: number): number {
  // Ensure confidence is within valid range (1-5)
  const clampedConfidence = Math.max(1, Math.min(5, confidence));
  return clampedConfidence / 5;
}

/**
 * Apply confidence weighting to a score
 */
export function applyConfidenceWeighting(score: number, confidence: number): number {
  const weight = calculateConfidenceWeight(confidence);
  return score * weight;
}

/**
 * Calculate weighted scores for all reviewers
 */
export function calculateWeightedScores(reviewerScores: ReviewerScore[]): WeightedReviewerScore[] {
  return reviewerScores.map(reviewer => {
    const confidenceWeight = calculateConfidenceWeight(reviewer.confidence);
    const weightedScore = reviewer.overallScore * confidenceWeight;

    return {
      ...reviewer,
      weightedScore,
      confidenceWeight,
    };
  });
}

/**
 * Get consensus indicators based on reviewer recommendations and confidence
 */
export function getConsensusIndicator(weightedScores: WeightedReviewerScore[]): {
  type: 'strong_accept' | 'lean_accept' | 'mixed' | 'lean_reject' | 'strong_reject' | 'uncertain';
  label: string;
  description: string;
} {
  if (weightedScores.length === 0) {
    return {
      type: 'uncertain',
      label: 'No Reviews',
      description: 'No completed reviews available'
    };
  }

  // Count recommendations by type, weighted by confidence
  const recommendationCounts = weightedScores.reduce((acc, reviewer) => {
    const weight = reviewer.confidenceWeight;
    acc[reviewer.recommendation] = (acc[reviewer.recommendation] ?? 0) + weight;
    return acc;
  }, {} as Record<string, number>);

  const totalWeight = weightedScores.reduce((sum, r) => sum + r.confidenceWeight, 0);
  const acceptWeight = recommendationCounts.ACCEPT ?? 0;
  const rejectWeight = recommendationCounts.REJECT ?? 0;
  const acceptPercentage = acceptWeight / totalWeight;
  const rejectPercentage = rejectWeight / totalWeight;

  // Determine consensus type
  if (acceptPercentage >= 0.8) {
    return {
      type: 'strong_accept',
      label: 'Strong Accept',
      description: `${Math.round(acceptPercentage * 100)}% weighted acceptance`
    };
  } else if (acceptPercentage >= 0.6) {
    return {
      type: 'lean_accept',
      label: 'Lean Accept',
      description: `${Math.round(acceptPercentage * 100)}% weighted acceptance`
    };
  } else if (rejectPercentage >= 0.8) {
    return {
      type: 'strong_reject',
      label: 'Strong Reject',
      description: `${Math.round(rejectPercentage * 100)}% weighted rejection`
    };
  } else if (rejectPercentage >= 0.6) {
    return {
      type: 'lean_reject',
      label: 'Lean Reject',
      description: `${Math.round(rejectPercentage * 100)}% weighted rejection`
    };
  } else {
    return {
      type: 'mixed',
      label: 'Mixed Reviews',
      description: 'Reviewers have conflicting recommendations'
    };
  }
}

/**
 * Get color for confidence level (for UI display)
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 5) return 'green';
  if (confidence >= 4) return 'blue';
  if (confidence >= 3) return 'yellow';
  if (confidence >= 2) return 'orange';
  return 'red';
}

/**
 * Get color for consensus type (for UI display)
 */
export function getConsensusColor(type: string): string {
  switch (type) {
    case 'strong_accept':
    case 'lean_accept':
      return 'green';
    case 'strong_reject':
    case 'lean_reject':
      return 'red';
    case 'mixed':
      return 'yellow';
    case 'uncertain':
    default:
      return 'gray';
  }
}