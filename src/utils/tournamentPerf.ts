/**
 * tournamentPerf.ts — compute actual tournament performance from match results
 *
 * Reads localStorage wc26-scores (actual match results) and computes a 0-100
 * performance score per team based on results in the tournament so far.
 * Teams without results fall back to their pre-tournament worldCupPerf.
 */

import { teams } from '../data/teams'

// ── Group matches (same data as ScheduleView / accuracy.ts) ─

interface FlatMatch {
  id: string
  home: string
  away: string
  group: string
}

const groupMatches: Record<string, [string, string, string, string, string][]> = {
  A: [
    ['6月11日', '13:00', 'mexico', 'south-africa', ''],
    ['6月11日', '20:00', 'south-korea', 'czech-republic', ''],
    ['6月18日', '12:00', 'czech-republic', 'south-africa', ''],
    ['6月18日', '19:00', 'mexico', 'south-korea', ''],
    ['6月24日', '19:00', 'czech-republic', 'mexico', ''],
    ['6月24日', '19:00', 'south-africa', 'south-korea', ''],
  ],
  B: [
    ['6月12日', '15:00', 'canada', 'bosnia', ''],
    ['6月13日', '12:00', 'qatar', 'switzerland', ''],
    ['6月18日', '12:00', 'switzerland', 'bosnia', ''],
    ['6月18日', '15:00', 'canada', 'qatar', ''],
    ['6月24日', '12:00', 'switzerland', 'canada', ''],
    ['6月24日', '12:00', 'bosnia', 'qatar', ''],
  ],
  C: [
    ['6月13日', '18:00', 'brazil', 'morocco', ''],
    ['6月13日', '21:00', 'haiti', 'scotland', ''],
    ['6月19日', '18:00', 'scotland', 'morocco', ''],
    ['6月19日', '21:00', 'brazil', 'haiti', ''],
    ['6月24日', '18:00', 'scotland', 'brazil', ''],
    ['6月24日', '18:00', 'morocco', 'haiti', ''],
  ],
  D: [
    ['6月12日', '18:00', 'usa', 'paraguay', ''],
    ['6月13日', '21:00', 'australia', 'turkey', ''],
    ['6月19日', '12:00', 'usa', 'australia', ''],
    ['6月19日', '20:00', 'turkey', 'paraguay', ''],
    ['6月25日', '19:00', 'turkey', 'usa', ''],
    ['6月25日', '19:00', 'paraguay', 'australia', ''],
  ],
  E: [
    ['6月14日', '12:00', 'germany', 'curacao', ''],
    ['6月14日', '19:00', 'ivory-coast', 'ecuador', ''],
    ['6月20日', '16:00', 'germany', 'ivory-coast', ''],
    ['6月20日', '19:00', 'ecuador', 'curacao', ''],
    ['6月25日', '16:00', 'curacao', 'ivory-coast', ''],
    ['6月25日', '16:00', 'ecuador', 'germany', ''],
  ],
  F: [
    ['6月14日', '15:00', 'netherlands', 'japan', ''],
    ['6月14日', '20:00', 'sweden', 'tunisia', ''],
    ['6月20日', '12:00', 'netherlands', 'sweden', ''],
    ['6月20日', '22:00', 'tunisia', 'japan', ''],
    ['6月25日', '18:00', 'japan', 'sweden', ''],
    ['6月25日', '18:00', 'tunisia', 'netherlands', ''],
  ],
  G: [
    ['6月15日', '12:00', 'belgium', 'egypt', ''],
    ['6月15日', '18:00', 'iran', 'new-zealand', ''],
    ['6月21日', '12:00', 'belgium', 'iran', ''],
    ['6月21日', '18:00', 'new-zealand', 'egypt', ''],
    ['6月26日', '20:00', 'egypt', 'iran', ''],
    ['6月26日', '20:00', 'new-zealand', 'belgium', ''],
  ],
  H: [
    ['6月15日', '12:00', 'spain', 'cape-verde', ''],
    ['6月15日', '18:00', 'saudi-arabia', 'uruguay', ''],
    ['6月21日', '12:00', 'spain', 'saudi-arabia', ''],
    ['6月21日', '18:00', 'uruguay', 'cape-verde', ''],
    ['6月26日', '19:00', 'cape-verde', 'saudi-arabia', ''],
    ['6月26日', '18:00', 'uruguay', 'spain', ''],
  ],
  I: [
    ['6月16日', '15:00', 'france', 'senegal', ''],
    ['6月16日', '18:00', 'iraq', 'norway', ''],
    ['6月22日', '17:00', 'france', 'iraq', ''],
    ['6月22日', '20:00', 'norway', 'senegal', ''],
    ['6月26日', '15:00', 'norway', 'france', ''],
    ['6月26日', '15:00', 'senegal', 'iraq', ''],
  ],
  J: [
    ['6月16日', '20:00', 'argentina', 'algeria', ''],
    ['6月16日', '21:00', 'austria', 'jordan', ''],
    ['6月22日', '12:00', 'argentina', 'austria', ''],
    ['6月22日', '20:00', 'jordan', 'algeria', ''],
    ['6月27日', '21:00', 'algeria', 'austria', ''],
    ['6月27日', '21:00', 'jordan', 'argentina', ''],
  ],
  K: [
    ['6月17日', '12:00', 'portugal', 'dr-congo', ''],
    ['6月17日', '20:00', 'uzbekistan', 'colombia', ''],
    ['6月23日', '12:00', 'portugal', 'uzbekistan', ''],
    ['6月23日', '20:00', 'colombia', 'dr-congo', ''],
    ['6月27日', '19:30', 'colombia', 'portugal', ''],
    ['6月27日', '19:30', 'dr-congo', 'uzbekistan', ''],
  ],
  L: [
    ['6月17日', '15:00', 'england', 'croatia', ''],
    ['6月17日', '19:00', 'ghana', 'panama', ''],
    ['6月23日', '16:00', 'england', 'ghana', ''],
    ['6月23日', '19:00', 'panama', 'croatia', ''],
    ['6月27日', '17:00', 'panama', 'england', ''],
    ['6月27日', '17:00', 'croatia', 'ghana', ''],
  ],
}

function buildGroupMatches(): FlatMatch[] {
  const result: FlatMatch[] = []
  for (const [g, raw] of Object.entries(groupMatches)) {
    raw.forEach(([, , home, away], mi) => {
      result.push({ id: `g-${g}-${mi}`, home, away, group: g })
    })
  }
  return result
}

/** Default scores from ScheduleView (hardcoded fallback) */
const DEFAULT_SCORES: Record<string, string> = {
  'g-A-0': '2-0',
  'g-A-1': '2-1',
  'g-B-0': '1-1',
  'g-D-0': '4-1',
  'g-B-1': '1-1',
  'g-C-0': '1-1',
  'g-C-1': '0-1',
  'g-D-1': '2-0',
}

export interface TeamPerf {
  teamId: string
  teamNameCN: string
  teamName: string
  flagCode: string
  group: string
  /** Tournament performance based on actual results (0-100) */
  perf: number
  /** Pre-tournament worldCupPerf from team data */
  preTournamentPerf: number
  /** Whether this is based on actual results or fallback */
  hasResults: boolean
  /** Matches played summary */
  matchesPlayed: number
  matchesWon: number
  matchesDrawn: number
  matchesLost: number
  goalsFor: number
  goalsAgainst: number
}

/**
 * Compute tournament performance for all teams
 * based on actual match results in localStorage.
 */
export function computeTournamentPerf(): TeamPerf[] {
  // Read actual scores from localStorage, with defaults
  let liveScores: Record<string, string> = { ...DEFAULT_SCORES }
  try {
    const stored = JSON.parse(localStorage.getItem('wc26-scores') || '{}')
    liveScores = { ...liveScores, ...stored }
  } catch { /* ignore */ }

  // Collect results per team
  const stats = new Map<string, {
    played: number; won: number; drawn: number; lost: number
    gf: number; ga: number
  }>()

  for (const t of teams) {
    stats.set(t.id, { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 })
  }

  const matches = buildGroupMatches()

  for (const m of matches) {
    const score = liveScores[m.id]
    if (!score) continue

    const [hG, aG] = score.split('-').map(Number)
    if (isNaN(hG) || isNaN(aG)) continue

    const home = stats.get(m.home)
    const away = stats.get(m.away)
    if (!home || !away) continue

    home.played++
    away.played++
    home.gf += hG
    home.ga += aG
    away.gf += aG
    away.ga += hG

    if (hG > aG) {
      home.won++
      away.lost++
    } else if (aG > hG) {
      away.won++
      home.lost++
    } else {
      home.drawn++
      away.drawn++
    }
  }

  // Compute performance scores
  const result: TeamPerf[] = []

  for (const t of teams) {
    const st = stats.get(t.id)!
    const hasResults = st.played > 0

    let perf: number

    if (hasResults) {
      // Points-based formula: map to 0-100
      const ptsPerMatch = (st.won * 3 + st.drawn * 1) / st.played  // 0-3
      const gdPerMatch = (st.gf - st.ga) / st.played
      // perf = ptsPerMatch * 20 + 20 + gdPerMatch * 5
      // Win 4-1 → 95, Win 2-0 → 90, Win 2-1 → 85, Draw 1-1 → 40, Loss 1-2 → 15, Loss 0-2 → 10
      perf = ptsPerMatch * 20 + 20 + gdPerMatch * 5
      perf = Math.max(0, Math.min(100, Math.round(perf)))
    } else {
      // No results yet — use pre-tournament value at half weight
      perf = Math.round(t.worldCupPerf / 2)
    }

    result.push({
      teamId: t.id,
      teamNameCN: t.nameCN,
      teamName: t.name,
      flagCode: t.flagCode,
      group: t.group,
      perf,
      preTournamentPerf: t.worldCupPerf,
      hasResults,
      matchesPlayed: st.played,
      matchesWon: st.won,
      matchesDrawn: st.drawn,
      matchesLost: st.lost,
      goalsFor: st.gf,
      goalsAgainst: st.ga,
    })
  }

  // Sort: teams with results first (by perf descending), then teams without
  result.sort((a, b) => {
    if (a.hasResults !== b.hasResults) return a.hasResults ? -1 : 1
    return b.perf - a.perf
  })

  return result
}
