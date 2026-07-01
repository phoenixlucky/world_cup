/**
 * debug-predictions.ts — Print WDL probabilities for each R32 match
 *
 * Run: npx tsx scripts/debug-predictions.ts
 */
import { teams } from '../src/data/teams'
import { LIVE_SCORES } from '../src/data/results'
import { computeScores, DEFAULT_WEIGHTS, type TeamScores } from '../src/engine/scorer'
import { computeAllStandings } from '../src/engine/standings'
import { neutralExpectedLambdas, poissonPMF } from '../src/engine/poisson'

// 1. Compute team scores with default weights
const scores = computeScores(teams, DEFAULT_WEIGHTS)
const standings = computeAllStandings(scores, LIVE_SCORES)

// 2. Build group rankings (same logic as before)
const groups = new Map<string, TeamScores[]>()
for (const s of scores) {
  if (!groups.has(s.group)) groups.set(s.group, [])
  groups.get(s.group)!.push(s)
}

const groupRanked = new Map<string, TeamScores[]>()
for (const [g, gTeams] of groups) {
  const groupSt = standings.get(g)
  if (groupSt) {
    const rankMap = new Map(groupSt.map((s, i) => [s.teamId, i]))
    const sorted = [...gTeams].sort(
      (a, b) => (rankMap.get(a.teamId) ?? 99) - (rankMap.get(b.teamId) ?? 99),
    )
    groupRanked.set(g, sorted)
  } else {
    groupRanked.set(g, [...gTeams].sort((a, b) => b.total - a.total))
  }
}

const slotMap = new Map<string, TeamScores>()
const allThird: { team: TeamScores; pts: number; gd: number; gf: number }[] = []
for (const [g, ranked] of groupRanked) {
  if (ranked[0]) slotMap.set(`${g}1`, ranked[0])
  if (ranked[1]) slotMap.set(`${g}2`, ranked[1])
  if (ranked[2]) {
    const st = standings.get(g)?.find(s => s.teamId === ranked[2].teamId)
    allThird.push({ team: ranked[2], pts: st?.pts ?? 0, gd: st?.gd ?? 0, gf: st?.gf ?? 0 })
  }
}

allThird.sort((a, b) => {
  if (b.pts !== a.pts) return b.pts - a.pts
  if (b.gd !== a.gd) return b.gd - a.gd
  return b.gf - a.gf
})
const bestThird = allThird.slice(0, 8)

const thirdMatchOrder = [74, 77, 79, 80, 81, 82, 85, 87]
const assigned = new Map<number, TeamScores>()
for (let i = 0; i < Math.min(bestThird.length, 8); i++) {
  assigned.set(thirdMatchOrder[i], bestThird[i].team)
}

const matchDefs: Record<number, [string, string]> = {
  73: ['A2', 'B2'],
  74: ['E1', assigned.get(74)?.teamId ?? ''],
  75: ['F1', 'C2'],
  76: ['C1', 'F2'],
  77: ['I1', assigned.get(77)?.teamId ?? ''],
  78: ['E2', 'I2'],
  79: ['A1', assigned.get(79)?.teamId ?? ''],
  80: ['L1', assigned.get(80)?.teamId ?? ''],
  81: ['D1', assigned.get(81)?.teamId ?? ''],
  82: ['G1', assigned.get(82)?.teamId ?? ''],
  83: ['K2', 'L2'],
  84: ['H1', 'J2'],
  85: ['B1', assigned.get(85)?.teamId ?? ''],
  86: ['J1', 'H2'],
  87: ['K1', assigned.get(87)?.teamId ?? ''],
  88: ['D2', 'G2'],
}

const resolveSlot = (slot: string): TeamScores | undefined => {
  if (/^[A-L][12]$/.test(slot)) return slotMap.get(slot)
  return scores.find(s => s.teamId === slot)
}

function calcWDL(s1: number, s2: number): { hw: number; dr: number; aw: number; bestHome: [number,number]; bestDraw: [number,number]; bestAway: [number,number] } {
  const [hλ, aλ] = neutralExpectedLambdas(s1, s2)
  let hw = 0, dr = 0, aw = 0
  let bhp = -1, bhs: [number,number] = [0,0]
  let bdp = -1, bds: [number,number] = [0,0]
  let bap = -1, bas: [number,number] = [0,0]

  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const prob = poissonPMF(h, hλ) * poissonPMF(a, aλ)
      if (h > a) {
        hw += prob
        if (prob > bhp) { bhp = prob; bhs = [h, a] }
      } else if (h === a) {
        dr += prob
        if (prob > bdp) { bdp = prob; bds = [h, a] }
      } else {
        aw += prob
        if (prob > bap) { bap = prob; bas = [h, a] }
      }
    }
  }
  return { hw, dr, aw, bestHome: bhs, bestDraw: bds, bestAway: bas }
}

console.log('Match-by-match WDL probabilities:')
console.log('='.repeat(80))

let matchIndex = 0
for (let m = 73; m <= 88; m++) {
  const def = matchDefs[m]
  if (!def) continue
  const [homeSlot, awaySlot] = def
  const home = resolveSlot(homeSlot)
  const away = resolveSlot(awaySlot)
  if (!home || !away) continue

  const { hw, dr, aw, bestHome, bestDraw, bestAway } = calcWDL(home.total, away.total)

  const winMargin = Math.max(hw, dr, aw) - Math.max(
    ...([hw, dr, aw].filter(v => v !== Math.max(hw, dr, aw)))
  )

  console.log(`Match ${matchIndex + 1} (r32-${matchIndex}): ${home.teamNameCN} (${home.total.toFixed(1)}) vs ${away.teamNameCN} (${away.total.toFixed(1)})`)
  console.log(`  主场胜=${(hw*100).toFixed(1)}% 平=${(dr*100).toFixed(1)}% 客胜=${(aw*100).toFixed(1)}%`)
  console.log(`  最可能主胜=${bestHome[0]}-${bestHome[1]} 最可能平局=${bestDraw[0]}-${bestDraw[1]} 最可能客胜=${bestAway[0]}-${bestAway[1]}`)
  console.log(`  胜率与第二差距=${(winMargin*100).toFixed(1)}pp`)
  console.log()
  matchIndex++
}
