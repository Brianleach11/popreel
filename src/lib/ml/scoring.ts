interface InteractionData {
  viewDuration: number;
  videoDuration: number;
  liked: boolean;
  commented: boolean;
  shared: boolean;
  timestamp: Date;
}

const SCORE_WEIGHTS = {
  LIKE: 0.5,
  SHARE: 0.7,
  COMMENT: 0.3,
  VIEW_75_PLUS: 0.4,
  VIEW_50_75: 0.2,
  VIEW_25_50: -0.2,
  VIEW_LESS_25: -0.4,
} as const;

const TIME_DECAY_FACTOR = 0.95; // 5% decay per week

/**
 * Calculate the weighted score for a user's interaction with a video
 */
export function calculateInteractionScore(
  interaction: InteractionData
): number {
  let score = 0;

  // Calculate view duration percentage
  const viewPercentage =
    interaction.videoDuration > 0
      ? interaction.viewDuration / interaction.videoDuration
      : 0;

  // Add score based on view duration
  if (viewPercentage >= 0.75) {
    score += SCORE_WEIGHTS.VIEW_75_PLUS;
  } else if (viewPercentage >= 0.5) {
    score += SCORE_WEIGHTS.VIEW_50_75;
  } else if (viewPercentage >= 0.25) {
    score += SCORE_WEIGHTS.VIEW_25_50;
  } else {
    score += SCORE_WEIGHTS.VIEW_LESS_25;
  }

  // Add scores for interactions
  if (interaction.liked) score += SCORE_WEIGHTS.LIKE;
  if (interaction.shared) score += SCORE_WEIGHTS.SHARE;
  if (interaction.commented) score += SCORE_WEIGHTS.COMMENT;

  // Apply time decay
  const weeksSinceInteraction =
    (Date.now() - interaction.timestamp.getTime()) / (7 * 24 * 60 * 60 * 1000);
  score *= Math.pow(TIME_DECAY_FACTOR, weeksSinceInteraction);

  // Ensure score doesn't go below 0
  return Math.max(0, score);
}

/**
 * Calculate trending score for a video based on recent interactions
 */
export function calculateTrendingScore(
  recentScores: { score: number; timestamp: Date }[]
): number {
  return recentScores.reduce((total, { score, timestamp }) => {
    const daysSinceInteraction =
      (Date.now() - timestamp.getTime()) / (24 * 60 * 60 * 1000);
    // More aggressive decay for trending (20% per day)
    const decay = Math.pow(0.8, daysSinceInteraction);
    return total + score * decay;
  }, 0);
}
