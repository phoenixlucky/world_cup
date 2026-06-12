/**
 * simulator.ts — Monte Carlo tournament simulator
 *
 * Runs N simulations of the full 2026 World Cup:
 *   1. Group stage (12 groups × 4 teams, round-robin)
 *   2. Knockout stage (32 teams → 16 → 8 → 4 → 2 → 1)
 *
 * Match outcome probabilities are derived from the team's combined score.
 */

import type { TeamScores } from './scorer'
import { teams } from '../data/teams'

// ── Types ─────────────────────────────────────────────────
export interface MatchResult {
  home: string
  away: string
  homeScore: number
  awayScore: number
  winner: string | null   // teamId or null for draw
}

export interface GroupStanding {
  teamId: string
  pts: number
  gf: number
  ga: number
  gd: number
  wins: number
}

export interface SimulationResult {
  /** Number of times each team won the tournament */
  championCounts: Record<string, number>
  /** Number of times each team reached the top 4 */
  semiFinalCounts: Record<string, number>
  /** Number of times each team advanced from group stage */
  knockoutCounts: Record<string, number>
  /** Total simulations run */
  totalSims: number
}

// ── Core simulation ───────────────────────────────────────

/** Calculate expected goals for a team based on its score vs opponent */
function expectedGoals(teamScore: number, opponentScore: number): number {
  const ratio = teamScore / Math.max(opponentScore, 1)
  // Scale: a team with 2x score scores ~2x goals
  const base = 1.2 * ratio
  return Math.max(0.3, Math.min(4.5, base + (Math.random() - 0.5) * 0.6))
}

/** Simulate a single match, return goals */
function simulateMatch(home: TeamScores, away: TeamScores): [number, number] {
  // Home advantage: +5% to score
  const homeGoals = Math.round(expectedGoals(home.total * 1.05, away.total))
  const awayGoals = Math.round(expectedGoals(away.total, home.total * 1.05))
  return [homeGoals, awayGoals]
}

/** Simulate one group (4 teams round-robin), return top 2 + best 3rd candidate */
function simulateGroup(
  groupTeams: TeamScores[],
): { qualified: string[]; standing: GroupStanding[]; thirdPlace: GroupStanding | null } {
  // Each team plays every other team once
  const standings: Record<string, GroupStanding> = {}

  for (const t of groupTeams) {
    standings[t.teamId] = { teamId: t.teamId, pts: 0, gf: 0, ga: 0, gd: 0, wins: 0 }
  }

  for (let i = 0; i < groupTeams.length; i++) {
    for (let j = i + 1; j < groupTeams.length; j++) {
      const home = groupTeams[i]
      const away = groupTeams[j]
      const [hG, aG] = simulateMatch(home, away)

      standings[home.teamId].gf += hG
      standings[home.teamId].ga += aG
      standings[away.teamId].gf += aG
      standings[away.teamId].ga += hG

      if (hG > aG) {
        standings[home.teamId].pts += 3
        standings[home.teamId].wins += 1
      } else if (aG > hG) {
        standings[away.teamId].pts += 3
        standings[away.teamId].wins += 1
      } else {
        standings[home.teamId].pts += 1
        standings[away.teamId].pts += 1
      }
    }
  }

  // Calculate GD
  for (const s of Object.values(standings)) {
    s.gd = s.gf - s.ga
  }

  // Sort by pts → GD → GF
  const sorted = Object.values(standings).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.gd !== a.gd) return b.gd - a.gd
    return b.gf - a.gf
  })

  return {
    qualified: sorted.slice(0, 2).map(s => s.teamId),
    standing: sorted,
    thirdPlace: sorted.length > 2 ? sorted[2] : null,
  }
}

/** Simulate a knockout match (must have a winner) */
function simulateKnockout(home: TeamScores, away: TeamScores): { winner: string } {
  const [hG, aG] = simulateMatch(home, away)

  if (hG !== aG) {
    return { winner: hG > aG ? home.teamId : away.teamId }
  }

  // Extra time / penalties: slight randomness
  return { winner: Math.random() < 0.5 ? home.teamId : away.teamId }
}

/** Get the lookup map from teamId → TeamScores */
function scoreMap(scores: TeamScores[]): Map<string, TeamScores> {
  const map = new Map<string, TeamScores>()
  for (const s of scores) {
    map.set(s.teamId, s)
  }
  // Safety: also add any team from seed data not in scores
  for (const t of teams) {
    if (!map.has(t.id)) {
      map.set(t.id, {
        teamId: t.id,
        teamName: t.name,
        teamNameCN: t.nameCN,
        flag: t.flag,
        flagCode: t.flagCode,
        group: t.group,
        continent: t.continent,
        raw: { rank: t.fifaRank, marketVal: t.marketVal, goals: t.goalsFor20, goalsAgainst: t.goalsAgainst20, wins: t.wins20, form: 50 },
        dim: { rank: 50, marketVal: 50, goals: 50, wins: 50, form: 50, luck: 50, hostBonus: 0, attackDefense: 50, opponentStrength: 50 },
        total: 50,
      })
    }
  }
  return map
}

/** Run a single full tournament simulation */
function simulateTournament(scores: TeamScores[]): {
  champion: string
  semiFinalists: string[]
  knockoutQualifiers: string[]
} {
  const smap = scoreMap(scores)
  const groups = new Map<string, TeamScores[]>()
  const thirdPlaceTeams: { teamId: string; pts: number; gd: number; gf: number; group: string }[] = []

  for (const s of scores) {
    if (!groups.has(s.group)) groups.set(s.group, [])
    groups.get(s.group)!.push(s)
  }

  // ── Group stage ──────────────────────────────────────
  const groupWinners: string[] = []
  const groupRunnersUp: string[] = []

  for (const [g, gTeams] of groups) {
    const { qualified, thirdPlace } = simulateGroup(gTeams)
    groupWinners.push(qualified[0])
    groupRunnersUp.push(qualified[1])
    if (thirdPlace) {
      thirdPlaceTeams.push({ teamId: thirdPlace.teamId, pts: thirdPlace.pts, gd: thirdPlace.gd, gf: thirdPlace.gf, group: g })
    }
  }

  // Top 8 third-placed teams qualify
  thirdPlaceTeams.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.gd !== a.gd) return b.gd - a.gd
    return b.gf - a.gf
  })

  const bestThird = thirdPlaceTeams.slice(0, 8).map(t => t.teamId)
  const allKnockout = [...groupWinners, ...groupRunnersUp, ...bestThird]

  if (allKnockout.length !== 32) {
    // Fallback if something went wrong
    return { champion: scores[0].teamId, semiFinalists: scores.slice(0, 4).map(s => s.teamId), knockoutQualifiers: allKnockout }
  }

  // ── Knockout stage (32 → 16 → 8 → 4 → 2 → 1) ───────
  // Seeding: group winners vs third-place; runners-up vs each other
  // Simplified pairing: seed 1-32 based on group performance
  const bracket = [...allKnockout]
  let round = bracket

  while (round.length > 1) {
    const nextRound: string[] = []
    for (let i = 0; i < round.length; i += 2) {
      const home = smap.get(round[i])
      const away = smap.get(round[i + 1])
      if (!home || !away) {
        // Fallback: advance the one that exists
        nextRound.push(home ? home.teamId : away!.teamId)
        continue
      }
      const { winner } = simulateKnockout(home, away)
      nextRound.push(winner)
    }
    round = round.length === 2
      ? nextRound  // Final → champion
      : nextRound
  }

  const champion = round[0]

  // Reconstruct semi-finalists (4 teams from quarter-finals)
  // We can work backwards: the last 4 teams before the final are the semi-finalists
  // For simplicity, track them during simulation
  const semiFinalists: string[] = []
  let r = [...allKnockout]
  while (r.length > 4) {
    const nr: string[] = []
    for (let i = 0; i < r.length; i += 2) {
      const h = smap.get(r[i])
      const a = smap.get(r[i + 1])
      if (!h || !a) {
        nr.push(h ? h.teamId : a!.teamId)
        continue
      }
      const { winner } = simulateKnockout(h, a)
      nr.push(winner)
    }
    r = nr
  }
  // r now has 4 semi-finalists
  for (let i = 0; i < r.length; i++) {
    semiFinalists.push(r[i])
  }
  // Simulate semis to get finalists
  const semis: string[] = []
  for (let i = 0; i < r.length; i += 2) {
    const h = smap.get(r[i])
    const a = smap.get(r[i + 1])
    if (!h || !a) {
      semis.push(h ? h.teamId : a!.teamId)
      continue
    }
    const { winner } = simulateKnockout(h, a)
    semis.push(winner)
  }
  // Final
  const fh = smap.get(semis[0])
  const fa = smap.get(semis[1])
  if (fh && fa) {
    const { winner } = simulateKnockout(fh, fa)
    return { champion: winner, semiFinalists: r, knockoutQualifiers: allKnockout }
  }

  return { champion: semis[0] || champion, semiFinalists: r, knockoutQualifiers: allKnockout }
}

/** Run N simulations and aggregate results */
export function runSimulation(
  scores: TeamScores[],
  numSims: number = 10000,
  onProgress?: (done: number) => void,
): SimulationResult {
  const championCounts: Record<string, number> = {}
  const semiFinalCounts: Record<string, number> = {}
  const knockoutCounts: Record<string, number> = {}

  // Initialise counters for all teams
  for (const s of scores) {
    championCounts[s.teamId] = 0
    semiFinalCounts[s.teamId] = 0
    knockoutCounts[s.teamId] = 0
  }

  const batchSize = Math.max(1, Math.floor(numSims / 100))

  for (let sim = 0; sim < numSims; sim++) {
    const result = simulateTournament(scores)

    if (result.champion) {
      championCounts[result.champion] = (championCounts[result.champion] || 0) + 1
    }
    for (const sid of result.semiFinalists) {
      semiFinalCounts[sid] = (semiFinalCounts[sid] || 0) + 1
    }
    for (const kid of result.knockoutQualifiers) {
      knockoutCounts[kid] = (knockoutCounts[kid] || 0) + 1
    }

    if (onProgress && sim % batchSize === 0) {
      onProgress(sim + 1)
    }
  }

  if (onProgress) onProgress(numSims)

  return { championCounts, semiFinalCounts, knockoutCounts, totalSims: numSims }
}

/** Convert counts to percentages */
export function toPercentages(
  counts: Record<string, number>,
  totalSims: number,
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [id, count] of Object.entries(counts)) {
    result[id] = Math.round((count / totalSims) * 10000) / 100
  }
  return result
}
