/**
 * scorer.ts — 7-dimension scoring engine
 *
 * Each dimension is normalised to [0, 100] via min-max scaling.
 * The final score is a weighted sum of all 7 dimensions.
 */

import type { Team } from '../data/teams'

// ── Dimension weights (defaults, user can override) ──────
export interface Weights {
  rank: number      // 名次加权
  marketVal: number  // 身价加权
  goals: number      // 进球加权
  wins: number       // 胜场加权
  form: number       // 状态加权
  luck: number       // 运气加权
  hostBonus: number  // 州加成
}

export const DEFAULT_WEIGHTS: Weights = {
  rank: 20,
  marketVal: 15,
  goals: 15,
  wins: 25,
  form: 15,
  luck: 5,
  hostBonus: 5,
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
    wins: number
    form: number
  }
  dim: {
    rank: number
    marketVal: number
    goals: number
    wins: number
    form: number
    luck: number
    hostBonus: number
  }
  total: number  // weighted sum
}

type NumericKey = 'rank' | 'marketVal' | 'goals' | 'wins'

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

/** Recent form string → numeric score (0-100) */
function formScore(form: string): number {
  const points = form
    .toUpperCase()
    .split('')
    .reduce((sum, ch) => {
      if (ch === 'W') return sum + 3
      if (ch === 'D') return sum + 1
      return sum
    }, 0)
  return (points / (form.length * 3)) * 100
}

/** Compute luck score: deterministic base + random jitter */
function luckScore(teamId: string): number {
  // Deterministic component based on team id hash
  let hash = 0
  for (let i = 0; i < teamId.length; i++) {
    hash = ((hash << 5) - hash) + teamId.charCodeAt(i)
    hash |= 0
  }
  const base = Math.abs(hash % 20) + 40  // 40-60 base
  // Random jitter ±10
  const jitter = (Math.random() - 0.5) * 20
  return Math.min(100, Math.max(0, base + jitter))
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

  // --- 2. Normalise ---
  const rankNorm = normalise(rankRaw, 'rank')
  const mvNorm = normalise(mvRaw, 'marketVal')
  const goalNorm = normalise(goalRatios, 'goals')
  const winNorm = normalise(winRates, 'wins')

  // --- 3. Build scores ---
  const totalWeight =
    weights.rank + weights.marketVal + weights.goals + weights.wins +
    weights.form + weights.luck + weights.hostBonus || 1

  return teams.map((t, i) => {
    const fScore = formScore(t.recentForm)
    const lScore = luckScore(t.id)
    const hBonus = HOST_BONUS[t.continent] ?? 0

    const dim = {
      rank: rankNorm[i],
      marketVal: mvNorm[i],
      goals: goalNorm[i],
      wins: winNorm[i],
      form: fScore,
      luck: lScore,
      hostBonus: hBonus,
    }

    const total = (
      dim.rank * weights.rank +
      dim.marketVal * weights.marketVal +
      dim.goals * weights.goals +
      dim.wins * weights.wins +
      dim.form * weights.form +
      dim.luck * weights.luck +
      dim.hostBonus * weights.hostBonus
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
        wins: t.wins20,
        form: fScore,
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
