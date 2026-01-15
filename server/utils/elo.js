/**
 * Advanced ELO rating engine for table tennis.
 * 
 * Features:
 * - Performance-based rating changes (not just win/loss)
 * - Margin of victory multiplier
 * - Dynamic K-factor based on experience (provisional vs established)
 * - Rust factor for inactive players
 * - Close loss bonus (underdogs can gain rating on close losses)
 */

// Base K-factors
const K_PROVISIONAL = 40;  // Higher volatility for new players
const K_ESTABLISHED = 24;  // Standard volatility

// Rating scale constant (standard ELO uses 400)
const RATING_SCALE = 400;

// Performance model weights
const WIN_ANCHOR_BONUS = 0.08;  // Small bonus for actually winning
const MARGIN_WEIGHT = 0.4;  // How much margin affects the multiplier
const DEUCE_BATTLE_BONUS = 0.06;  // Bonus for both players in extended deuce games

// Maximum points in a game (table tennis standard)
const MAX_POINTS = 11;

// Rust factor settings
const RUST_GRACE_PERIOD = 14;  // Days before rust kicks in
const RUST_SCALE = 60;  // Days for rust to reach max
const RUST_MAX = 2.0;  // Maximum rust multiplier
const RUST_DECAY_RATE = 0.4;  // Lose 40% of excess rust per game

/**
 * Calculate expected performance score for player A against player B.
 * Returns value between 0 and 1.
 */
export function expectedPerformance(ratingA, ratingB) {
  const exponent = (ratingB - ratingA) / RATING_SCALE;
  return 1.0 / (1.0 + Math.pow(10, exponent));
}

/**
 * Calculate actual performance score based on points.
 * Creates a continuous measure where:
 * - 11-0 win → ~1.0
 * - 11-9 win → ~0.55 + win bonus
 * - 9-11 loss → ~0.45
 * - 0-11 loss → ~0.0
 */
export function actualPerformance(pointsFor, pointsAgainst, won) {
  const total = pointsFor + pointsAgainst;
  if (total === 0) return 0.5;

  let basePerformance = pointsFor / total;

  // Add win anchor bonus
  if (won) {
    basePerformance += WIN_ANCHOR_BONUS;
  }

  // Deuce battle bonus - reward extended competitive games
  const winnerScore = Math.max(pointsFor, pointsAgainst);
  if (winnerScore > MAX_POINTS) {
    // Intensity scales with how long the deuce lasted
    const deuceIntensity = (winnerScore - MAX_POINTS) / 10;
    basePerformance += DEUCE_BATTLE_BONUS * deuceIntensity;
  }

  // Clamp to valid range
  return Math.max(0.0, Math.min(1.0, basePerformance));
}

/**
 * Calculate multiplier based on margin of victory.
 * Blowout wins/losses have amplified rating changes.
 * Close games have dampened changes.
 */
export function marginMultiplier(margin, totalPoints, winnerScore) {
  if (totalPoints === 0) return 1.0;

  let normalizedMargin;
  
  // For deuce games, use relative margin
  if (winnerScore > MAX_POINTS) {
    const relativeMargin = margin / totalPoints;
    normalizedMargin = relativeMargin * (totalPoints / MAX_POINTS) * 0.5;
  } else {
    // Normal games: use absolute margin
    normalizedMargin = margin / MAX_POINTS;
  }

  // Range: ~1.0 (close game) to ~1.4 (blowout)
  return 1.0 + (normalizedMargin * MARGIN_WEIGHT);
}

/**
 * Calculate time-based rust multiplier.
 * After 14 days of inactivity, K-factor starts increasing.
 * Caps at 2x after ~2 months.
 */
export function getTimeBasedRust(daysInactive) {
  if (daysInactive <= RUST_GRACE_PERIOD) {
    return 1.0;
  }

  const excessDays = daysInactive - RUST_GRACE_PERIOD;
  const multiplier = 1.0 + (excessDays / RUST_SCALE);

  return Math.min(multiplier, RUST_MAX);
}

/**
 * Get effective rust multiplier for a player.
 * Takes the maximum of time-based rust and accumulated rust.
 */
export function getRustMultiplier(daysInactive, accumulatedRust) {
  const timeRust = getTimeBasedRust(daysInactive);
  return Math.min(Math.max(timeRust, accumulatedRust), RUST_MAX);
}

/**
 * Decay accumulated rust after playing a game.
 * Each game removes a percentage of excess rust.
 */
export function decayRust(accumulatedRust) {
  const excessRust = accumulatedRust - 1.0;
  const newRust = 1.0 + excessRust * (1.0 - RUST_DECAY_RATE);
  
  // Clamp to 1.0 if very close
  return newRust < 1.01 ? 1.0 : newRust;
}

/**
 * Get K-factor for a player.
 * Provisional players (< 10 games) have higher K for faster convergence.
 * Established players have lower K for stability.
 * Inactive players have higher K (rust factor) for recalibration.
 */
export function getKFactor(gamesPlayed, rustMultiplier = 1.0) {
  // Base K-factor
  let baseK;
  if (gamesPlayed < 10) {
    // Smooth transition from K_PROVISIONAL to K_ESTABLISHED
    const progress = gamesPlayed / 10;
    baseK = K_PROVISIONAL - (K_PROVISIONAL - K_ESTABLISHED) * progress;
  } else {
    baseK = K_ESTABLISHED;
  }

  // Apply rust multiplier
  return baseK * rustMultiplier;
}

/**
 * Calculate days since last game
 */
export function daysSinceLastGame(lastPlayedDate) {
  if (!lastPlayedDate) return 0;
  const now = new Date();
  const lastPlayed = new Date(lastPlayedDate);
  const days = Math.floor((now - lastPlayed) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

/**
 * Calculate rating changes for both players after a match.
 * Returns { winnerChange, loserChange, details }
 * 
 * The magic: rating change is based on performance vs expectation,
 * not just win/loss. This allows underdogs to gain rating on close losses!
 */
export function calculateRatingChanges(
  winnerRating,
  loserRating,
  winnerScore,
  loserScore,
  winnerGamesPlayed,
  loserGamesPlayed,
  winnerLastPlayed,
  loserLastPlayed,
  winnerRustAccumulated,
  loserRustAccumulated,
  matchDate
) {
  // Expected performances
  const winnerExpected = expectedPerformance(winnerRating, loserRating);
  const loserExpected = expectedPerformance(loserRating, winnerRating);

  // Actual performances
  const winnerActual = actualPerformance(winnerScore, loserScore, true);
  const loserActual = actualPerformance(loserScore, winnerScore, false);

  // Performance deltas (positive = exceeded expectations)
  const winnerDelta = winnerActual - winnerExpected;
  const loserDelta = loserActual - loserExpected;

  // Margin multiplier
  const margin = winnerScore - loserScore;
  const total = winnerScore + loserScore;
  const mult = marginMultiplier(margin, total, winnerScore);

  // Calculate rust multipliers
  const winnerDaysInactive = daysSinceLastGame(winnerLastPlayed);
  const loserDaysInactive = daysSinceLastGame(loserLastPlayed);
  
  const winnerRust = getRustMultiplier(winnerDaysInactive, winnerRustAccumulated);
  const loserRust = getRustMultiplier(loserDaysInactive, loserRustAccumulated);

  // Update accumulated rust to reflect any new inactivity
  const winnerTimeRust = getTimeBasedRust(winnerDaysInactive);
  const loserTimeRust = getTimeBasedRust(loserDaysInactive);
  const newWinnerRust = Math.max(winnerRustAccumulated, winnerTimeRust);
  const newLoserRust = Math.max(loserRustAccumulated, loserTimeRust);

  // K-factors (with rust)
  const winnerK = getKFactor(winnerGamesPlayed, winnerRust);
  const loserK = getKFactor(loserGamesPlayed, loserRust);

  // Calculate raw changes
  const winnerChange = winnerK * winnerDelta * mult;
  const loserChange = loserK * loserDelta * mult;

  return {
    winnerChange: Math.round(winnerChange * 100) / 100, // Round to 2 decimals
    loserChange: Math.round(loserChange * 100) / 100,
    winnerRust: Math.round(winnerRust * 100) / 100,
    loserRust: Math.round(loserRust * 100) / 100,
    winnerDaysInactive,
    loserDaysInactive,
    newWinnerRust: Math.round(newWinnerRust * 100) / 100,
    newLoserRust: Math.round(newLoserRust * 100) / 100,
  };
}

/**
 * Legacy function for backward compatibility
 */
export function calculateELOChange(playerRating, opponentRating, score, kFactor = 32) {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  return Math.round(kFactor * (score - expectedScore));
}

export function calculateNewRating(currentRating, eloChange) {
  return Math.max(0, currentRating + eloChange);
}

export function getExpectedScore(playerRating, opponentRating) {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}
