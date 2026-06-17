/**
 * accuracy.ts — compute prediction accuracy statistics
 *
 * Reads actual match scores (from localStorage wc26-scores) and compares them
 * against the deterministic prediction model (same as ScheduleView).
 */

import { teams } from '../data/teams'

// ── Match types (mirrored from ScheduleView) ───────────────

interface Match {
  id: string
  date: string
  dateNum: number
  timeStr: string     // "HH:MM" local time
  home: string
  away: string
  round: string
  group?: string
}

interface MatchAccuracy {
  matchId: string
  dateNum: number
  timeStr: string
  homeName: string
  awayName: string
  actualScore: string       // "2-0"
  predictedScore: string    // "1-1"
  actualOutcome: 'home' | 'draw' | 'away'
  predictedOutcome: 'home' | 'draw' | 'away'
  outcomeCorrect: boolean
  scoreCorrect: boolean
}

export interface AccuracyStats {
  totalMatches: number
  correctOutcomes: number
  correctScores: number
  matchDetails: MatchAccuracy[]
}

// ── Group matches (same data as ScheduleView) ──────────────

type RawMatch = [string, string, string, string, string]

const groupMatches: Record<string, RawMatch[]> = {
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

/** Build flat list of group matches */
function buildGroupMatches(): Match[] {
  const result: Match[] = []
  for (const [g, raw] of Object.entries(groupMatches)) {
    raw.forEach(([date, time, home, away], mi) => {
      result.push({
        id: `g-${g}-${mi}`,
        date,
        dateNum: parseDateNum(date),
        timeStr: time,
        home,
        away,
        round: 'group',
        group: g,
      })
    })
  }
  return result
}

/** Parse "6月11日" → month*100+day */
function parseDateNum(s: string): number {
  const m = s.match(/(\d+)月(\d+)日/)
  if (!m) return 0
  return parseInt(m[1]) * 100 + parseInt(m[2])
}

function getOutcome(homeScore: number, awayScore: number): 'home' | 'draw' | 'away' {
  if (homeScore > awayScore) return 'home'
  if (awayScore > homeScore) return 'away'
  return 'draw'
}

/** Default scores from ScheduleView (hardcoded fallback) */
const DEFAULT_SCORES: Record<string, string> = {
  'g-A-0': '2-0',   // Mexico 2-0 South Africa
  'g-A-1': '2-1',   // South Korea 2-1 Czech Republic
  'g-B-0': '1-1',   // Canada 1-1 Bosnia
  'g-D-0': '4-1',   // USA 4-1 Paraguay
  'g-B-1': '1-1',   // Qatar 1-1 Switzerland
  'g-C-0': '1-1',   // Brazil 1-1 Morocco
  'g-C-1': '0-1',   // Haiti 0-1 Scotland
  'g-D-1': '2-0',   // Australia 2-0 Turkey
  'g-E-0': '7-1',   // Germany 7-1 Curacao
  'g-F-0': '2-2',   // Netherlands 2-2 Japan
  'g-E-1': '1-0',   // Ivory Coast 1-0 Ecuador
  'g-F-1': '5-1',   // Sweden 5-1 Tunisia
  'g-G-0': '1-1',   // Belgium 1-1 Egypt
  'g-H-0': '0-0',   // Spain 0-0 Cape Verde
  'g-H-1': '1-1',   // Saudi Arabia 1-1 Uruguay
  'g-G-1': '2-2',   // Iran 2-2 New Zealand
  'g-I-0': '3-1',   // France 3-1 Senegal
  'g-I-1': '1-4',   // Iraq 1-4 Norway (updated)
  'g-J-1': '3-1',   // Austria 3-1 Jordan
  'g-J-0': '3-0',   // Argentina 3-0 Algeria
}

/** Hardcoded old-model predictions for the default-score matches.
 *  Written to stone so algorithm updates never affect completed matches. */
const DEFAULT_PREDICTIONS: Record<string, string> = {
  'g-A-0': '2-1',   // Mexico 2-1 South Africa
  'g-A-1': '1-1',   // South Korea 1-1 Czech Republic
  'g-B-0': '2-1',   // Canada 2-1 Bosnia
  'g-D-0': '2-1',   // USA 2-1 Paraguay
  'g-B-1': '1-3',   // Qatar 1-3 Switzerland
  'g-C-0': '2-1',   // Brazil 2-1 Morocco
  'g-C-1': '0-3',   // Haiti 0-3 Scotland
  'g-D-1': '1-2',   // Australia 1-2 Turkey
  'g-E-0': '5-0',   // Germany 5-0 Curacao
  'g-F-0': '1-1',   // Netherlands 1-1 Japan
  'g-E-1': '1-1',   // Ivory Coast 1-1 Ecuador
  'g-F-1': '3-0',   // Sweden 3-0 Tunisia
  'g-G-0': '2-0',   // Belgium 2-0 Egypt
  'g-G-1': '3-0',   // Iran 3-0 New Zealand
  'g-H-0': '4-0',   // Spain 4-0 Cape Verde
  'g-H-1': '0-2',   // Saudi Arabia 0-2 Uruguay
  'g-I-0': '2-0',   // France 2-0 Senegal
  'g-I-1': '0-3',   // Iraq 0-3 Norway
  'g-J-1': '2-0',   // Austria 2-0 Jordan
  'g-J-0': '2-0',   // Argentina 2-0 Algeria
}

export function computeAccuracy(): AccuracyStats {
  // Read actual scores from localStorage, fall back to defaults
  let liveScores: Record<string, string> = { ...DEFAULT_SCORES }
  try {
    const stored = JSON.parse(localStorage.getItem('wc26-scores') || '{}')
    liveScores = { ...liveScores, ...stored }
  } catch { /* ignore */ }

  // Read cached predictions (set by ScheduleView)
  let cachedPreds: Record<string, string> = {}
  try {
    cachedPreds = JSON.parse(localStorage.getItem('wc26-predicted') || '{}')
  } catch { /* ignore */ }

  // Also check frozen predictions (for matches within 2 days)
  let frozenPreds: Record<string, string> = {}
  try {
    frozenPreds = JSON.parse(localStorage.getItem('wc26-frozen-predictions') || '{}')
  } catch { /* ignore */ }

  // Build team name map
  const teamMap = new Map(teams.map(t => [t.id, t]))

  // Collect all group matches
  const allMatches = buildGroupMatches()

  const details: MatchAccuracy[] = []

  for (const m of allMatches) {
    const actualScore = liveScores[m.id]
    if (!actualScore) continue  // no result yet, skip

    const homeTeam = teamMap.get(m.home)
    const awayTeam = teamMap.get(m.away)
    if (!homeTeam || !awayTeam) continue

    // Use hardcoded default prediction first, then frozen, then cached.
    // Never recompute — completed-match predictions are written in stone.
    const predicted = DEFAULT_PREDICTIONS[m.id] || frozenPreds[m.id] || cachedPreds[m.id] || ''
    if (!predicted) continue

    const [aH, aA] = actualScore.split('-').map(Number)
    const [pH, pA] = predicted.split('-').map(Number)

    if (isNaN(aH) || isNaN(aA) || isNaN(pH) || isNaN(pA)) continue

    const actualOutcome = getOutcome(aH, aA)
    const predictedOutcome = getOutcome(pH, pA)

    details.push({
      matchId: m.id,
      dateNum: m.dateNum,
      timeStr: m.timeStr,
      homeName: homeTeam.nameCN || homeTeam.name,
      awayName: awayTeam.nameCN || awayTeam.name,
      actualScore,
      predictedScore: predicted,
      actualOutcome,
      predictedOutcome,
      outcomeCorrect: actualOutcome === predictedOutcome,
      scoreCorrect: aH === pH && aA === pA,
    })
  }

  const totalMatches = details.length
  const correctOutcomes = details.filter(d => d.outcomeCorrect).length
  const correctScores = details.filter(d => d.scoreCorrect).length

  return { totalMatches, correctOutcomes, correctScores, matchDetails: details }
}
