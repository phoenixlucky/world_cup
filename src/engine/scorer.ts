/**
 * scorer.ts — 10-dimension scoring engine
 *
 * Each dimension is normalised to [0, 100] via min-max scaling.
 * The final score is a weighted sum of all 10 dimensions.
 */

import type { Team } from '../data/teams'

// ── Dimension weights (defaults, user can override) ──────
export interface Weights {
  rank: number        // 名次加权
  marketVal: number   // 身价加权
  goals: number       // 进球加权
  wins: number        // 胜场加权
  form: number        // 状态加权
  luck: number        // 运气加权
  hostBonus: number   // 州加成
  attackDefense: number // 攻防专项能力
  opponentStrength: number // 对手强度校准
  worldCupPerf: number // 本次世界杯表现得分
}

export const DEFAULT_WEIGHTS: Weights = {
  rank: 14,
  marketVal: 9,
  goals: 7,
  wins: 14,
  form: 9,
  luck: 9,
  hostBonus: 5,
  attackDefense: 14,
  opponentStrength: 10,
  worldCupPerf: 10,
}

// ── Continent host bonus multipliers ─────────────────────
const HOST_BONUS: Record<string, number> = {
  CONCACAF: 10,   // 主办洲
  CONMEBOL: 3,    // 南美（地理接近）
  UEFA: 0,
  CAF: 0,
  AFC: 0,
  OFC: 0,
}

// ── Opponent strength multiplier (higher = faced tougher opponents) ──
const OPPONENT_STRENGTH: Record<string, number> = {
  UEFA: 1.15,
  CONMEBOL: 1.10,
  CONCACAF: 1.00,
  CAF: 0.95,
  AFC: 0.90,
  OFC: 0.85,
}

// ── Normalised dimension scores (each 0-100) ─────────────
export interface TeamScores {
  teamId: string
  teamName: string
  teamNameCN: string
  flag: string
  flagCode: string
  group: string
  continent: string
  raw: {
    rank: number
    marketVal: number
    goals: number
    goalsAgainst: number
    wins: number
    form: number
    worldCupPerf: number
  }
  dim: {
    rank: number
    marketVal: number
    goals: number
    wins: number
    form: number
    luck: number
    hostBonus: number
    attackDefense: number
    opponentStrength: number
    worldCupPerf: number
  }
  total: number  // weighted sum
}

type NumericKey = 'rank' | 'marketVal' | 'goals' | 'wins' | 'attackDefense' | 'opponentStrength' | 'worldCupPerf'

/** Min-max normalise an array of numbers to [0, 100] (higher = better).
 *  For rank, lower is better so we invert. */
function normalise(values: number[], key: NumericKey): number[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  return values.map(v => {
    const raw = (v - min) / range * 100
    return key === 'rank' ? 100 - raw : raw  // invert rank so lower rank → higher score
  })
}

/** Recent form string → numeric score (0-100) with exponential decay.
 *  Recent matches are weighted more heavily.
 *  "W"=3, "D"=1, "L"=0, decay factor 0.85 per match. */
function formScore(form: string): number {
  const chars = form.toUpperCase().split('')
  let totalWeight = 0
  let weightedPoints = 0

  for (let i = 0; i < chars.length; i++) {
    const weight = Math.pow(0.85, chars.length - 1 - i) // last match = weight 1.0
    const ch = chars[i]
    if (ch === 'W') weightedPoints += 3 * weight
    else if (ch === 'D') weightedPoints += 1 * weight
    // 'L' contributes 0
    totalWeight += weight
  }

  return (weightedPoints / (totalWeight * 3)) * 100
}

/** Momentum score based on recent form trend.
 *  Rewards teams on a hot streak, penalizes teams in a slump.
 *  Replaces the old random-based "luck" — deterministic and predictive. */
function momentumScore(form: string): number {
  const chars = form.toUpperCase().split('').reverse() // most recent first
  const last3 = chars.slice(0, 3)
  const pts = last3.reduce((sum, ch) => {
    if (ch === 'W') return sum + 3
    if (ch === 'D') return sum + 1
    return sum
  }, 0)
  // 0/9 → 30, 1-2/9 → 40, 3-4/9 → 50, 5-6/9 → 65, 7-9/9 → 80
  if (pts >= 7) return 80
  if (pts >= 5) return 65
  if (pts >= 3) return 50
  if (pts >= 1) return 40
  return 30
}

/** Compute scores for all teams */
export function computeScores(
  teams: Team[],
  weights: Weights = DEFAULT_WEIGHTS,
  randomSeed?: number,
): TeamScores[] {
  // Seed RNG if provided (for reproducibility) — simple mulberry32
  let rng = randomSeed != null
    ? mulberry32(randomSeed)
    : () => Math.random()

  if (randomSeed != null) {
    // Override Math.random temporarily — not ideal but keeps code simple
    const origRandom = Math.random
    Math.random = rng
    const result = computeScoresRaw(teams, weights)
    Math.random = origRandom
    return result
  }

  return computeScoresRaw(teams, weights)
}

function computeScoresRaw(teams: Team[], weights: Weights): TeamScores[] {
  // --- 1. Collect raw values ---
  const rankRaw = teams.map(t => t.fifaRank)
  const mvRaw = teams.map(t => t.marketVal)
  const goalRatios = teams.map(t => t.goalsFor20 / (t.goalsFor20 + t.goalsAgainst20 || 1) * 100)
  const winRates = teams.map(t => (t.wins20 / Math.max(t.wins20 + t.losses20 + t.draws20, 1)) * 100)
  const adRaw = teams.map(t => {
    const attackRate = t.goalsFor20 / 20       // goals scored per game
    const defenseRate = t.goalsAgainst20 / 20   // goals conceded per game
    // GD component (original formula)
    const gdScore = (attackRate - defenseRate) * 10 + 50
    // Defensive solidity component: invert GA so fewer conceded = higher score
    const defScore = Math.max(0, 100 - defenseRate * 30)
    // Blend: 60% GD + 40% defensive resilience
    return gdScore * 0.6 + defScore * 0.4
  })
  const osRaw = teams.map(t => (OPPONENT_STRENGTH[t.continent] ?? 1.0) * 100) // opponent strength
  const wcRaw = teams.map(t => t.worldCupPerf) // already 0-100

  // --- 2. Normalise ---
  const rankNorm = normalise(rankRaw, 'rank')
  const mvNorm = normalise(mvRaw, 'marketVal')
  const goalNorm = normalise(goalRatios, 'goals')
  const winNorm = normalise(winRates, 'wins')
  const adNorm = normalise(adRaw, 'attackDefense')
  const osNorm = normalise(osRaw, 'opponentStrength')
  const wcNorm = normalise(wcRaw, 'worldCupPerf')

  // --- 3. Build scores ---
  const totalWeight =
    weights.rank + weights.marketVal + weights.goals + weights.wins +
    weights.form + weights.luck + weights.hostBonus +
    weights.attackDefense + weights.opponentStrength +
    weights.worldCupPerf || 1

  return teams.map((t, i) => {
    const fScore = formScore(t.recentForm)
    const lScore = momentumScore(t.recentForm)
    const hBonus = HOST_BONUS[t.continent] ?? 0

    const dim = {
      rank: rankNorm[i],
      marketVal: mvNorm[i],
      goals: goalNorm[i],
      wins: winNorm[i],
      form: fScore,
      luck: lScore,
      hostBonus: hBonus,
      attackDefense: adNorm[i],
      opponentStrength: osNorm[i],
      worldCupPerf: wcNorm[i],
    }

    const total = (
      dim.rank * weights.rank +
      dim.marketVal * weights.marketVal +
      dim.goals * weights.goals +
      dim.wins * weights.wins +
      dim.form * weights.form +
      dim.luck * weights.luck +
      dim.hostBonus * weights.hostBonus +
      dim.attackDefense * weights.attackDefense +
      dim.opponentStrength * weights.opponentStrength +
      dim.worldCupPerf * weights.worldCupPerf
    ) / totalWeight

    return {
      teamId: t.id,
      teamName: t.name,
      teamNameCN: t.nameCN,
      flag: t.flag,
      flagCode: t.flagCode,
      group: t.group,
      continent: t.continent,
      raw: {
        rank: t.fifaRank,
        marketVal: t.marketVal,
        goals: t.goalsFor20,
        goalsAgainst: t.goalsAgainst20,
        wins: t.wins20,
        form: fScore,
        worldCupPerf: t.worldCupPerf,
      },
      dim,
      total: Math.round(total * 100) / 100,
    }
  })
}

/** Simple seeded PRNG (mulberry32) */
function mulberry32(a: number): () => number {
  return function () {
    let t = a += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

/** Sort scores descending */
export function sortScores(scores: TeamScores[]): TeamScores[] {
  return [...scores].sort((a, b) => b.total - a.total)
}
