/**
 * standings.ts — Compute deterministic group standings from predicted scores
 *
 * Each group has 4 teams playing round-robin (6 matches).
 * Match pairings follow the real schedule pattern:
 *   (0,1), (2,3), (3,1), (0,2), (3,0), (1,2) — first index is home
 */

import { predictMostLikelyScore } from './poisson'
import type { TeamScores } from './scorer'

export interface GroupStanding {
  teamId: string
  pts: number
  gf: number
  ga: number
  gd: number
  wins: number
  draws: number
  losses: number
}

/** Compute standings for one group (4 teams) using deterministic predicted scores */
export function computeGroupStandings(groupTeams: TeamScores[]): GroupStanding[] {
  if (groupTeams.length !== 4) return []

  const standings: Record<string, GroupStanding> = {}
  for (const t of groupTeams) {
    standings[t.teamId] = { teamId: t.teamId, pts: 0, gf: 0, ga: 0, gd: 0, wins: 0, draws: 0, losses: 0 }
  }

  // Pairings: (homeIdx, awayIdx) based on the real schedule pattern
  const pairings: [number, number][] = [[0, 1], [2, 3], [3, 1], [0, 2], [3, 0], [1, 2]]

  for (const [hIdx, aIdx] of pairings) {
    const home = groupTeams[hIdx]
    const away = groupTeams[aIdx]
    const [hG, aG] = predictMostLikelyScore(home.total, away.total)

    standings[home.teamId].gf += hG
    standings[home.teamId].ga += aG
    standings[away.teamId].gf += aG
    standings[away.teamId].ga += hG

    if (hG > aG) {
      standings[home.teamId].pts += 3
      standings[home.teamId].wins += 1
      standings[away.teamId].losses += 1
    } else if (aG > hG) {
      standings[away.teamId].pts += 3
      standings[away.teamId].wins += 1
      standings[home.teamId].losses += 1
    } else {
      standings[home.teamId].pts += 1
      standings[away.teamId].pts += 1
      standings[home.teamId].draws += 1
      standings[away.teamId].draws += 1
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
export function computeAllStandings(scores: TeamScores[]): Map<string, GroupStanding[]> {
  const groups = new Map<string, TeamScores[]>()
  for (const s of scores) {
    if (!groups.has(s.group)) groups.set(s.group, [])
    groups.get(s.group)!.push(s)
  }

  const result = new Map<string, GroupStanding[]>()
  for (const [g, gTeams] of groups) {
    result.set(g, computeGroupStandings(gTeams))
  }
  return result
}
