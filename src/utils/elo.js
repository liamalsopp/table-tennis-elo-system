/**
 * Calculate ELO rating change after a match
 * @param {number} playerRating - Current ELO rating of the player
 * @param {number} opponentRating - Current ELO rating of the opponent
 * @param {number} score - 1 for win, 0.5 for draw, 0 for loss
 * @param {number} kFactor - K-factor (default 32, can be adjusted)
 * @returns {number} - ELO rating change
 */
export function calculateELOChange(playerRating, opponentRating, score, kFactor = 32) {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  return Math.round(kFactor * (score - expectedScore));
}

/**
 * Calculate new ELO rating after a match
 * @param {number} currentRating - Current ELO rating
 * @param {number} eloChange - ELO change from the match
 * @returns {number} - New ELO rating
 */
export function calculateNewRating(currentRating, eloChange) {
  return Math.max(0, currentRating + eloChange); // Ensure rating doesn't go below 0
}

/**
 * Calculate expected score (probability of winning)
 * @param {number} playerRating - Current ELO rating of the player
 * @param {number} opponentRating - Current ELO rating of the opponent
 * @returns {number} - Expected score (0-1)
 */
export function getExpectedScore(playerRating, opponentRating) {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

