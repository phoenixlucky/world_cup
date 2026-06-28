/**
 * poisson.ts — Poisson distribution utilities
 *
 * Used by the Monte Carlo simulator and score predictor to generate
 * realistic football scores that match real-world distributions.
 *
 * Real-world baseline (top-5 leagues + World Cup):
 *   WDL: 45% home / 25% draw / 30% away
 *   Scores: 1:1 10-12%, 1:0 9-11%, 2:1 8-10%, 2:0 7-9%, 0:0 6-8%, 0:1 5-7%
 *
 * Calibrated λ parameters:
 *   baseRate = 1.35
 *   homeAdvantage = 1.15
 *   → equal teams: λ_home = 1.55, λ_away = 1.35
 *   → WDL ≈ 44/25/31, score distribution matches real data
 */

/** Poisson probability mass function: P(X = k) = e^{-λ} λ^k / k! */
export function poissonPMF(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0
  if (k < 0) return 0
  // Use log to avoid overflow for large k
  const logP = -lambda + k * Math.log(lambda) - logFactorial(k)
  return Math.exp(logP)
}

/** Generate a Poisson random variate (Knuth's algorithm) */
export function poissonRandom(lambda: number): number {
  if (lambda <= 0) return 0
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= Math.random()
  } while (p > L)
  return k - 1
}

/**
 * Calculate expected goals (λ) for home and away teams.
 *
 * @param homeStrength  Team score [0-100]
 * @param awayStrength  Team score [0-100]
 * @returns [homeLambda, awayLambda] — expected goals for each team
 */
export function expectedLambdas(
  homeStrength: number,
  awayStrength: number,
): [number, number] {
  const rawRatio = homeStrength / Math.max(awayStrength, 1)
  const ratio = Math.sqrt(rawRatio) // dampen extreme mismatches

  const baseRate = 1.35
  const homeAdv = 1.15

  const homeLambda = Math.max(0.1, Math.min(6.0, baseRate * ratio * homeAdv))
  const awayLambda = Math.max(0.1, Math.min(6.0, baseRate / ratio))

  return [homeLambda, awayLambda]
}

/**
 * Expected lambdas for neutral‑venue matches (e.g. World Cup knockout).
 * No home‑advantage multiplier — both teams are treated equally.
 */
export function neutralExpectedLambdas(
  teamAStrength: number,
  teamBStrength: number,
): [number, number] {
  const rawRatio = teamAStrength / Math.max(teamBStrength, 1)
  const ratio = Math.sqrt(rawRatio)

  const baseRate = 1.35

  const teamALambda = Math.max(0.1, Math.min(6.0, baseRate * ratio))
  const teamBLambda = Math.max(0.1, Math.min(6.0, baseRate / ratio))

  return [teamALambda, teamBLambda]
}

/**
 * Generate a match score from independent Poisson distributions.
 * Returns [homeGoals, awayGoals] with each capped at 0-9.
 */
export function generateScore(
  homeStrength: number,
  awayStrength: number,
): [number, number] {
  const [hλ, aλ] = expectedLambdas(homeStrength, awayStrength)
  return [
    Math.min(9, poissonRandom(hλ)),
    Math.min(9, poissonRandom(aλ)),
  ]
}

/**
 * Predict the single most likely score by iterating all score pairs 0-6.
 * Used for deterministic prediction display.
 */
export function predictMostLikelyScore(
  homeStrength: number,
  awayStrength: number,
): [number, number] {
  const [hλ, aλ] = expectedLambdas(homeStrength, awayStrength)

  let bestProb = -1
  let bestScore: [number, number] = [0, 0]

  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      const prob = poissonPMF(h, hλ) * poissonPMF(a, aλ)
      // Weight by plausibility — cap low-prob scores slightly
      if (prob > bestProb) {
        bestProb = prob
        bestScore = [h, a]
      }
    }
  }

  return bestScore
}

export interface ScoreProbs {
  homeWin: number
  draw: number
  awayWin: number
  scoreProb: number   // probability of the most likely score
}

/**
 * Predict the most likely score by outcome-consistency:
 * 1. Find the most likely outcome (home/draw/away)
 * 2. Within that outcome, find the single most likely score
 * AND compute WDL / exact-score probabilities.
 */
export function predictScoreProbs(
  homeStrength: number,
  awayStrength: number,
): { score: [number, number]; probs: ScoreProbs; bestOverallScore: [number, number] } {
  const [hλ, aλ] = expectedLambdas(homeStrength, awayStrength)

  let bestOverallScore: [number, number] = [0, 0]
  let bestOverallProb = -1
  let homeWin = 0, draw = 0, awayWin = 0

  let bestHomeProb = -1, bestHomeScore: [number, number] = [0, 0]
  let bestDrawProb = -1, bestDrawScore: [number, number] = [0, 0]
  let bestAwayProb = -1, bestAwayScore: [number, number] = [0, 0]

  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      const prob = poissonPMF(h, hλ) * poissonPMF(a, aλ)
      if (prob > bestOverallProb) {
        bestOverallProb = prob
        bestOverallScore = [h, a]
      }
      if (h > a) {
        homeWin += prob
        if (prob > bestHomeProb) { bestHomeProb = prob; bestHomeScore = [h, a] }
      } else if (h === a) {
        draw += prob
        if (prob > bestDrawProb) { bestDrawProb = prob; bestDrawScore = [h, a] }
      } else {
        awayWin += prob
        if (prob > bestAwayProb) { bestAwayProb = prob; bestAwayScore = [h, a] }
      }
    }
  }

  const outcome = homeWin >= draw && homeWin >= awayWin ? 'home'
    : draw >= homeWin && draw >= awayWin ? 'draw'
    : 'away'

  const outcomeScore = outcome === 'home' ? bestHomeScore
    : outcome === 'draw' ? bestDrawScore
    : bestAwayScore

  const outcomeScoreProb = outcome === 'home' ? bestHomeProb
    : outcome === 'draw' ? bestDrawProb
    : bestAwayProb

  return {
    score: outcomeScore,
    probs: { homeWin, draw, awayWin, scoreProb: outcomeScoreProb },
    bestOverallScore,
  }
}

/**
 * Full knockout match result: regular time → extra time → penalties.
 *
 * Uses outcome-consistent scoring at each stage:
 * 1. Determine most likely OUTCOME (home win / draw / away win)
 * 2. Within that outcome, pick the most likely score
 * This avoids the "all 1-1" trap of raw most-likely-score.
 *
 * Extra time uses a fatigue factor (~0.45 of regular lambda).
 * Penalties are strength-calibrated with realistic variance.
 */
export interface KnockoutResult {
  /** Regular‑time score (90 min) */
  regular: [number, number]
  /** Whether extra time was needed (regular time was a draw) */
  hasExtraTime: boolean
  /** Aggregate score after extra time (undefined if no extra time) */
  afterExtraTime?: [number, number]
  /** Whether penalties were needed (still tied after extra time) */
  hasPenalties: boolean
  /** Penalty shootout score (undefined if no penalties) */
  penalties?: [number, number]
  /** Overall winner */
  winner: 'home' | 'away'
}

export function predictFullKnockoutResult(
  homeStrength: number,
  awayStrength: number,
): KnockoutResult {
  // ── Step 1: Regular time (90 min) — outcome-consistent, neutral venue ──
  const rt = predictOutcomeConsistentScore(homeStrength, awayStrength, true)
  const [rH, rA] = rt.score

  // Settled in regular time
  if (rt.outcome !== 'draw') {
    return {
      regular: rt.score,
      hasExtraTime: false,
      hasPenalties: false,
      winner: rt.outcome === 'home' ? 'home' : 'away',
    }
  }

  // ── Step 2: Extra time (30 min) — fatigue-adjusted, neutral ─────
  const [hλ, aλ] = neutralExpectedLambdas(homeStrength, awayStrength)
  const etFactor = 0.45
  const et = predictOutcomeConsistentFromLambdas(hλ * etFactor, aλ * etFactor)
  const [etH, etA] = et.score
  const afterExtraTime: [number, number] = [rH + etH, rA + etA]

  // Settled in extra time
  if (et.outcome !== 'draw') {
    return {
      regular: rt.score,
      hasExtraTime: true,
      afterExtraTime,
      hasPenalties: false,
      winner: et.outcome === 'home' ? 'home' : 'away',
    }
  }

  // ── Step 3: Penalties ─────────────────────────────────
  const penalties = predictPenaltyScore(homeStrength, awayStrength)
  const [pH, pA] = penalties
  const winner: 'home' | 'away' = pH >= pA ? 'home' : 'away'

  return {
    regular: rt.score,
    hasExtraTime: true,
    afterExtraTime,
    hasPenalties: true,
    penalties,
    winner,
  }
}

/**
 * Outcome-consistent score prediction.
 *
 * 1. Compute aggregate WDL probabilities
 * 2. Pick the most likely outcome (home / draw / away)
 * 3. Within that outcome, find the single most likely score
 *
 * This prevents "1-1 always wins" syndrome — even if 1-1 is the
 * single most likely pair, if home win combined probability > draw,
 * we pick the most likely home win score instead.
 */
interface OutcomeScore {
  score: [number, number]
  outcome: 'home' | 'draw' | 'away'
}

function predictOutcomeConsistentScore(
  homeStrength: number,
  awayStrength: number,
  neutral?: boolean,
): OutcomeScore {
  const [hλ, aλ] = neutral
    ? neutralExpectedLambdas(homeStrength, awayStrength)
    : expectedLambdas(homeStrength, awayStrength)
  return predictOutcomeConsistentFromLambdas(hλ, aλ)
}

function predictOutcomeConsistentFromLambdas(
  hλ: number,
  aλ: number,
): OutcomeScore {
  let homeWin = 0, draw = 0, awayWin = 0

  let bestHomeProb = -1, bestHomeScore: [number, number] = [0, 0]
  let bestDrawProb = -1, bestDrawScore: [number, number] = [0, 0]
  let bestAwayProb = -1, bestAwayScore: [number, number] = [0, 0]

  // Iterate over realistic score range
  const maxGoals = 5
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const prob = poissonPMF(h, hλ) * poissonPMF(a, aλ)

      if (h > a) {
        homeWin += prob
        if (prob > bestHomeProb) { bestHomeProb = prob; bestHomeScore = [h, a] }
      } else if (h === a) {
        draw += prob
        if (prob > bestDrawProb) { bestDrawProb = prob; bestDrawScore = [h, a] }
      } else {
        awayWin += prob
        if (prob > bestAwayProb) { bestAwayProb = prob; bestAwayScore = [h, a] }
      }
    }
  }

  // Pick the most likely outcome, with diversity for close matches.
  // ── Diversity logic ──────────────────────────────────
  // When the top outcome's margin over the second is small, inject variety:
  // - Prefer draw → extra time/penalties (realistic for knockout football)
  // - Minor upsets when the data supports it
  const MARGIN = 0.10 // 10pp threshold for "close match"

  if (homeWin >= draw && homeWin >= awayWin) {
    const runnerUp = Math.max(draw, awayWin)
    if (homeWin - runnerUp < MARGIN) {
      // Close match — prefer draw to create extra time
      return { score: bestDrawScore, outcome: 'draw' }
    }
    return { score: bestHomeScore, outcome: 'home' }
  } else if (draw >= homeWin && draw >= awayWin) {
    const runnerUp = Math.max(homeWin, awayWin)
    if (draw - runnerUp < MARGIN) {
      // Close — flip to a win to avoid "all draws"
      if (homeWin >= awayWin) {
        return { score: bestHomeScore, outcome: 'home' }
      } else {
        return { score: bestAwayScore, outcome: 'away' }
      }
    }
    return { score: bestDrawScore, outcome: 'draw' }
  } else {
    const runnerUp = Math.max(homeWin, draw)
    if (awayWin - runnerUp < MARGIN) {
      // Close match — prefer draw to create extra time
      return { score: bestDrawScore, outcome: 'draw' }
    }
    return { score: bestAwayScore, outcome: 'away' }
  }
}

/**
 * Penalty shootout predictor with realistic variance.
 *
 * 5-round shootout. Success rates (70-82%) based on team strength.
 * If tied after 5 rounds, sudden death continues with the stronger
 * team having a marginal advantage — but not guaranteed.
 */
function predictPenaltyScore(
  homeStrength: number,
  awayStrength: number,
): [number, number] {
  // Strength-adjusted success rates: 70% base + 0-12% from strength
  const homeRate = 0.70 + (homeStrength / 100) * 0.12
  const awayRate = 0.70 + (awayStrength / 100) * 0.12

  // Expected score after 5 rounds (rounded to simulate variance)
  const homeExpected = 5 * homeRate
  const awayExpected = 5 * awayRate

  // Add small variance based on strength difference to create diversity
  const strengthDiff = (homeStrength - awayStrength) / 100
  const homeAdj = Math.round(homeExpected + Math.sign(strengthDiff) * Math.min(Math.abs(strengthDiff), 0.5))
  const awayAdj = Math.round(awayExpected - Math.sign(strengthDiff) * Math.min(Math.abs(strengthDiff), 0.5))

  let hScore = Math.max(2, Math.min(6, homeAdj))
  let aScore = Math.max(2, Math.min(6, awayAdj))

  // Sudden death if tied after 5 rounds
  if (hScore === aScore) {
    // Stronger team slightly more likely to win sudden death, not guaranteed
    const total = homeStrength + awayStrength
    if (total > 0 && homeStrength / total >= 0.55) {
      hScore += 1  // 5-4
    } else if (total > 0 && awayStrength / total >= 0.55) {
      aScore += 1  // 4-5
    } else {
      // Very close — could go either way, give 5-4 to home as marginal favorite
      hScore += 1
    }
  }

  return [Math.min(hScore, 7), Math.min(aScore, 7)]
}

// ── Legacy predictor (preserved for already‑completed matches) ──
// ── Helpers ────────────────────────────────────────────────

/** Pre-computed log factorials up to 20 (more than enough for λ ≤ 6) */
const LOG_FACTORIALS: number[] = [0]  // ln(0!) = 0

function logFactorial(n: number): number {
  // Extend cache as needed
  for (let i = LOG_FACTORIALS.length; i <= n; i++) {
    LOG_FACTORIALS[i] = LOG_FACTORIALS[i - 1] + Math.log(i)
  }
  return LOG_FACTORIALS[n]
}
