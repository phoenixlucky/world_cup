/**
 * standings.ts — Compute group standings from actual + predicted scores
 *
 * Each group has 4 teams playing round-robin (6 matches).
 * Match pairings are derived from the real schedule (ScheduleView's groupMatches).
 * Match IDs follow the pattern `g-{group}-{index}` (0–5).
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

/**
 * Real group-match pairings as [homeTeamId, awayTeamId] per match index (0–5).
 * Each group has 6 round-robin matches.
 * Match ID = `g-${group}-${index}`.
 */
const GROUP_MATCHES: Record<string, [string, string][]> = {
  A: [['mexico','south-africa'],['south-korea','czech-republic'],['czech-republic','south-africa'],['mexico','south-korea'],['czech-republic','mexico'],['south-africa','south-korea']],
  B: [['canada','bosnia'],['qatar','switzerland'],['switzerland','bosnia'],['canada','qatar'],['switzerland','canada'],['bosnia','qatar']],
  C: [['brazil','morocco'],['haiti','scotland'],['scotland','morocco'],['brazil','haiti'],['scotland','brazil'],['morocco','haiti']],
  D: [['usa','paraguay'],['australia','turkey'],['usa','australia'],['turkey','paraguay'],['turkey','usa'],['paraguay','australia']],
  E: [['germany','curacao'],['ivory-coast','ecuador'],['germany','ivory-coast'],['ecuador','curacao'],['curacao','ivory-coast'],['ecuador','germany']],
  F: [['netherlands','japan'],['sweden','tunisia'],['netherlands','sweden'],['tunisia','japan'],['japan','sweden'],['tunisia','netherlands']],
  G: [['belgium','egypt'],['iran','new-zealand'],['belgium','iran'],['new-zealand','egypt'],['egypt','iran'],['new-zealand','belgium']],
  H: [['spain','cape-verde'],['saudi-arabia','uruguay'],['spain','saudi-arabia'],['uruguay','cape-verde'],['cape-verde','saudi-arabia'],['uruguay','spain']],
  I: [['france','senegal'],['iraq','norway'],['france','iraq'],['norway','senegal'],['norway','france'],['senegal','iraq']],
  J: [['argentina','algeria'],['austria','jordan'],['argentina','austria'],['jordan','algeria'],['algeria','austria'],['jordan','argentina']],
  K: [['portugal','dr-congo'],['uzbekistan','colombia'],['portugal','uzbekistan'],['colombia','dr-congo'],['colombia','portugal'],['dr-congo','uzbekistan']],
  L: [['england','croatia'],['ghana','panama'],['england','ghana'],['panama','croatia'],['panama','england'],['croatia','ghana']],
}

/**
 * Compute standings for one group (4 teams).
 *
 * @param groupTeams  The 4 teams in this group
 * @param groupLabel  Group label (e.g. "A", "B")
 * @param liveScores  Actual scores keyed by match ID (e.g. "g-A-0": "2-1")
 */
export function computeGroupStandings(
  groupTeams: TeamScores[],
  groupLabel: string,
  liveScores: Record<string, string>,
): GroupStanding[] {
  const pairings = GROUP_MATCHES[groupLabel]
  if (!pairings || pairings.length !== 6) return []

  // Build a lookup: teamId → TeamScores
  const tm = new Map<string, TeamScores>()
  for (const t of groupTeams) tm.set(t.teamId, t)

  const standings = new Map<string, GroupStanding>()
  for (const t of groupTeams) {
    standings.set(t.teamId, {
      teamId: t.teamId, pts: 0, actualPts: 0, predPts: 0,
      gf: 0, ga: 0, gd: 0, wins: 0, draws: 0, losses: 0,
    })
  }

  for (let mi = 0; mi < pairings.length; mi++) {
    const [homeId, awayId] = pairings[mi]
    const matchId = `g-${groupLabel}-${mi}`
    const home = tm.get(homeId)
    const away = tm.get(awayId)
    if (!home || !away) continue

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

    const hs = standings.get(homeId)!
    const as = standings.get(awayId)!

    hs.gf += hG; hs.ga += aG
    as.gf += aG; as.ga += hG

    if (hG > aG) {
      hs.pts += 3; hs.wins += 1
      if (isActual) hs.actualPts += 3; else hs.predPts += 3
      as.losses += 1
    } else if (aG > hG) {
      as.pts += 3; as.wins += 1
      if (isActual) as.actualPts += 3; else as.predPts += 3
      hs.losses += 1
    } else {
      hs.pts += 1; as.pts += 1
      hs.draws += 1; as.draws += 1
      if (isActual) { hs.actualPts += 1; as.actualPts += 1 }
      else { hs.predPts += 1; as.predPts += 1 }
    }
  }

  // GD
  for (const s of standings.values()) {
    s.gd = s.gf - s.ga
  }

  // Sort by actualPts → predPts → GD → GF
  return Array.from(standings.values()).sort((a, b) => {
    if (b.actualPts !== a.actualPts) return b.actualPts - a.actualPts
    if (b.predPts !== a.predPts) return b.predPts - a.predPts
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
