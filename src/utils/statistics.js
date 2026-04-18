// ============================================
// Statistical Utilities for A/B Testing
// ============================================
// Performs statistical significance testing, variant selection,
// and confidence interval calculations for A/B tests.
// ============================================

/**
 * Approximation of the cumulative standard normal distribution (CDF).
 * Uses the Abramowitz and Stegun approximation formula.
 * Accurate to ~0.0002.
 * @param {number} z - Z-score
 * @returns {number} Cumulative probability (0-1)
 */
function normalCDF(z) {
  const b1 = 0.319381530
  const b2 = -0.356563782
  const b3 = 1.781477937
  const b4 = -1.821255978
  const b5 = 1.330274429
  const p = 0.2316419
  const c = 0.39894228

  const absZ = Math.abs(z)
  const t = 1.0 / (1.0 + p * absZ)

  const numerator =
    c * Math.exp((-z * z) / 2.0) *
    (t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5)))))

  if (z >= 0) {
    return 1.0 - numerator
  } else {
    return numerator
  }
}

/**
 * Calculate statistical significance between two variants using two-proportion z-test.
 * @param {Object} varA - Variant A metrics { impressions, clicks }
 * @param {Object} varB - Variant B metrics { impressions, clicks }
 * @returns {Object} Significance results
 *   {
 *     winner: string|null - 'A', 'B', or null if no winner
 *     confidence: number - Confidence level (0-1)
 *     isSignificant: boolean - Whether result is significant (>95% confidence)
 *     uplift: number - Relative uplift percentage (from A to B)
 *     pValue: number - P-value from z-test
 *     zScore: number - Absolute z-score
 *   }
 */
export function calculateSignificance(varA, varB) {
  const p1 = varA.impressions > 0 ? varA.clicks / varA.impressions : 0
  const p2 = varB.impressions > 0 ? varB.clicks / varB.impressions : 0

  const n1 = varA.impressions
  const n2 = varB.impressions

  // Need minimum sample size for meaningful test
  if (n1 < 30 || n2 < 30) {
    return {
      winner: null,
      confidence: 0,
      isSignificant: false,
      uplift: ((p2 - p1) / (p1 || 0.001)) * 100,
      pValue: 1,
      zScore: 0,
    }
  }

  // Pooled proportion for standard error
  const p_pool = (varA.clicks + varB.clicks) / (n1 + n2)

  // Standard error of difference
  const se = Math.sqrt(p_pool * (1 - p_pool) * (1 / n1 + 1 / n2))

  // Z-score
  const z = se > 0 ? (p2 - p1) / se : 0
  const absZ = Math.abs(z)

  // Two-tailed p-value
  const pValue = 2 * (1 - normalCDF(absZ))

  // Confidence level (1 - p-value)
  const confidence = Math.max(0, 1 - pValue)

  // Determine winner and uplift
  let winner = null
  let uplift = 0

  if (p1 > 0) {
    uplift = ((p2 - p1) / p1) * 100
  }

  if (confidence > 0.95) {
    winner = p2 > p1 ? 'B' : 'A'
  }

  return {
    winner,
    confidence,
    isSignificant: confidence > 0.95,
    uplift,
    pValue,
    zScore: absZ,
  }
}

/**
 * Select a variant using weighted random selection.
 * Used by link rotator to distribute traffic according to variant weights.
 * @param {Array} variants - Array of { id, destination_url, weight }
 * @returns {Object} Selected variant or null if no variants
 */
export function selectVariant(variants) {
  if (!variants || variants.length === 0) {
    return null
  }

  // Filter out zero-weight variants and calculate total weight
  const activeVariants = variants.filter((v) => v.weight > 0)

  if (activeVariants.length === 0) {
    return null
  }

  const totalWeight = activeVariants.reduce((sum, v) => sum + v.weight, 0)

  if (totalWeight <= 0) {
    return null
  }

  // Generate random value and select variant
  let rand = Math.random() * totalWeight
  for (const variant of activeVariants) {
    rand -= variant.weight
    if (rand <= 0) {
      return variant
    }
  }

  // Fallback to last variant if rounding error
  return activeVariants[activeVariants.length - 1]
}

/**
 * Format confidence level as human-readable text (in Indonesian).
 * @param {number} confidence - Confidence level (0-1)
 * @returns {string} Human-readable confidence text
 */
export function formatConfidence(confidence) {
  const percent = confidence * 100

  if (percent < 50) {
    return 'Tidak cukup data'
  }

  if (percent < 90) {
    return 'Belum signifikan'
  }

  if (percent < 95) {
    return 'Mendekati signifikan'
  }

  return 'Signifikan!'
}

/**
 * Calculate minimum sample size needed for A/B test.
 * Uses the formula: n = (z_alpha + z_beta)^2 * (p * (1-p)) / (mde * p)^2
 * where:
 *   - z_alpha is critical value for significance level
 *   - z_beta is critical value for statistical power
 *   - p is baseline conversion rate
 *   - mde is minimum detectable effect (relative improvement)
 * @param {number} [baseRate=0.05] - Baseline conversion rate (5%)
 * @param {number} [mde=0.2] - Minimum detectable effect as relative uplift (20%)
 * @param {number} [power=0.8] - Statistical power (80%)
 * @param {number} [alpha=0.05] - Significance level (5%)
 * @returns {number} Minimum sample size per variant
 */
export function getMinSampleSize(baseRate = 0.05, mde = 0.2, power = 0.8, alpha = 0.05) {
  // Z-values for common alpha/power levels
  const z_alpha = 1.96 // two-tailed, alpha=0.05
  const z_beta = 0.84 // one-tailed, power=0.8

  // Absolute effect size
  const p2 = baseRate * (1 + mde)

  // Pooled proportion
  const p_pool = (baseRate + p2) / 2

  // Standard error variance
  const variance = p_pool * (1 - p_pool) * 2

  // Sample size formula
  const numerator = Math.pow(z_alpha + z_beta, 2) * variance
  const denominator = Math.pow(p2 - baseRate, 2)

  return Math.ceil(numerator / denominator)
}

// Export all functions
export default {
  calculateSignificance,
  selectVariant,
  formatConfidence,
  getMinSampleSize,
}
