/**
 * standings.ts — Compute group standings from actual + predicted scores
 *
 * Each group has 4 teams playing round-robin (6 matches).
 * Match pairings follow the real schedule pattern:
 *   (0,1), (2,3), (3,1), (0,2), (3,0), (1,2) — first index is home
 * Match IDs follow the pattern `g-{group}-{pairingIndex}` (0–5).
 *
 * For completed matches (in liveScores), actual results are used.
 * For unplayed matches, scores are predicted via the Poisson engine.
 */

import { predictMostLikelyScore } from './poisson'
import type { TeamScores } from './scorer'

export interface GroupStanding {
  teamId: string
  /** Actual points from completed matches */
  actualPts: number
  /** Predicted points from unplayed matches */
  predPts: number
  /** Total points (actual + predicted) */
  pts: number
  gf: number
  ga: number
  gd: number
  wins: number
  draws: number
  losses: number
}

/** Pairings: (homeIdx, awayIdx, matchIdSuffix) — based on the real schedule */
const PAIRINGS: [number, number, number][] = [
  [0, 1, 0], [2, 3, 1], [3, 1, 2], [0, 2, 3], [3, 0, 4], [1, 2, 5],
]

/**
 * Compute standings for one group (4 teams).
 *
 * @param groupTeams  The 4 teams in this group, in original roster order
 * @param groupLabel  Group label (e.g. "A", "B") used to form match IDs
 * @param liveScores  Actual scores keyed by match ID (e.g. "g-A-0": "2-1")
 */
export function computeGroupStandings(
  groupTeams: TeamScores[],
  groupLabel: string,
  liveScores: Record<string, string>,
): GroupStanding[] {
  if (groupTeams.length !== 4) return []

  const standings: Record<string, GroupStanding> = {}
  for (const t of groupTeams) {
    standings[t.teamId] = {
      teamId: t.teamId, pts: 0, actualPts: 0, predPts: 0,
      gf: 0, ga: 0, gd: 0, wins: 0, draws: 0, losses: 0,
    }
  }

  for (const [hIdx, aIdx, mi] of PAIRINGS) {
    const home = groupTeams[hIdx]
    const away = groupTeams[aIdx]
    const matchId = `g-${groupLabel}-${mi}`

    const realScore = liveScores[matchId]
    let hG: number, aG: number
    let isActual: boolean

    if (realScore) {
      const parts = realScore.split('-').map(Number)
      hG = parts[0]
      aG = parts[1]
      isActual = true
    } else {
      ;[hG, aG] = predictMostLikelyScore(home.total, away.total)
      isActual = false
    }

    standings[home.teamId].gf += hG
    standings[home.teamId].ga += aG
    standings[away.teamId].gf += aG
    standings[away.teamId].ga += hG

    if (hG > aG) {
      standings[home.teamId].pts += 3
      standings[home.teamId].wins += 1
      if (isActual) standings[home.teamId].actualPts += 3
      else standings[home.teamId].predPts += 3
      standings[away.teamId].losses += 1
    } else if (aG > hG) {
      standings[away.teamId].pts += 3
      standings[away.teamId].wins += 1
      if (isActual) standings[away.teamId].actualPts += 3
      else standings[away.teamId].predPts += 3
      standings[home.teamId].losses += 1
    } else {
      standings[home.teamId].pts += 1
      standings[away.teamId].pts += 1
      standings[home.teamId].draws += 1
      standings[away.teamId].draws += 1
      if (isActual) {
        standings[home.teamId].actualPts += 1
        standings[away.teamId].actualPts += 1
      } else {
        standings[home.teamId].predPts += 1
        standings[away.teamId].predPts += 1
      }
    }
  }

  // GD
  for (const s of Object.values(standings)) {
    s.gd = s.gf - s.ga
  }

  // Sort by pts → GD → GF
  return Object.values(standings).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.gd !== a.gd) return b.gd - a.gd
    return b.gf - a.gf
  })
}

/** Compute standings for all groups */
export function computeAllStandings(
  scores: TeamScores[],
  liveScores: Record<string, string> = {},
): Map<string, GroupStanding[]> {
  const groups = new Map<string, TeamScores[]>()
  for (const s of scores) {
    if (!groups.has(s.group)) groups.set(s.group, [])
    groups.get(s.group)!.push(s)
  }

  const result = new Map<string, GroupStanding[]>()
  for (const [g, gTeams] of groups) {
    result.set(g, computeGroupStandings(gTeams, g, liveScores))
  }
  return result
}
