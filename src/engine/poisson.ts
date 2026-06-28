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
 * Models all three stages deterministically:
 * 1. **Regular time** (90 min): most likely Poisson score
 * 2. **Extra time** (30 min, only if regular time is a draw): reduced lambdas (fatigue)
 * 3. **Penalties** (only if still tied after extra time): strength-based shootout
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
  const regular = predictMostLikelyScore(homeStrength, awayStrength)
  const [rH, rA] = regular

  // ── Case 1: settled in regular time ────────────────
  if (rH !== rA) {
    return {
      regular,
      hasExtraTime: false,
      hasPenalties: false,
      winner: rH > rA ? 'home' : 'away',
    }
  }

  // ── Case 2: regular time is a draw → extra time ────
  // Extra time lambdas: 30 min / 90 min × fatigue factor ≈ 0.33
  const [hλ, aλ] = expectedLambdas(homeStrength, awayStrength)
  const etFactor = 0.33
  const etHome = predictMostLikelyScoreFromLambdas(hλ * etFactor, aλ * etFactor)
  const [etH, etA] = etHome

  const afterExtraTime: [number, number] = [rH + etH, rA + etA]

  if (etH !== etA) {
    return {
      regular,
      hasExtraTime: true,
      afterExtraTime,
      hasPenalties: false,
      winner: etH > etA ? 'home' : 'away',
    }
  }

  // ── Case 3: still tied → penalties ─────────────────
  const penalties = predictPenaltyScore(homeStrength, awayStrength)
  const [pH, pA] = penalties
  const winner: 'home' | 'away' = pH >= pA ? 'home' : 'away'

  return {
    regular,
    hasExtraTime: true,
    afterExtraTime,
    hasPenalties: true,
    penalties,
    winner,
  }
}

/** Predict the most likely score from pre‑computed lambdas (0‑4 range). */
function predictMostLikelyScoreFromLambdas(
  hλ: number,
  aλ: number,
): [number, number] {
  let bestProb = -1
  let bestScore: [number, number] = [0, 0]

  for (let h = 0; h <= 4; h++) {
    for (let a = 0; a <= 4; a++) {
      const prob = poissonPMF(h, hλ) * poissonPMF(a, aλ)
      if (prob > bestProb) {
        bestProb = prob
        bestScore = [h, a]
      }
    }
  }

  return bestScore
}

/**
 * Predict the most likely penalty shootout score.
 *
 * Model: each team takes 5 penalties. Each penalty has a success rate
 * based on team strength (70‑80%). If tied after 5 rounds, sudden death
 * continues with the stronger team more likely to win.
 */
function predictPenaltyScore(
  homeStrength: number,
  awayStrength: number,
): [number, number] {
  // Success rate: 70% base + up to 10% from strength
  const homeRate = 0.70 + (homeStrength / 100) * 0.10
  const awayRate = 0.70 + (awayStrength / 100) * 0.10

  // Expected score after 5 rounds each
  let hScore = Math.round(5 * homeRate)
  let aScore = Math.round(5 * awayRate)

  // Sudden death if tied after 5 rounds
  if (hScore === aScore) {
    // Stronger team wins in sudden death
    const total = homeStrength + awayStrength
    if (total > 0 && homeStrength / total >= 0.5) {
      hScore += 1  // home wins 5-4 or 6-5
    } else {
      aScore += 1  // away wins
    }
  }

  // Clamp to realistic range
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
