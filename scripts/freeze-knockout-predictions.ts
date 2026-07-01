/**
 * freeze-knockout-predictions.ts — 使用尉缭子分析法生成淘汰赛封存预测
 *
 * Run: npx tsx scripts/freeze-knockout-predictions.ts
 */
import { teams } from '../src/data/teams'
import { LIVE_SCORES } from '../src/data/results'
import { computeScores, DEFAULT_WEIGHTS, type TeamScores } from '../src/engine/scorer'
import { computeAllStandings } from '../src/engine/standings'
import { predictFullKnockoutResult } from '../src/engine/poisson'

// 1. Compute team scores with default weights
const scores = computeScores(teams, DEFAULT_WEIGHTS)
const standings = computeAllStandings(scores, LIVE_SCORES)

// 2. Build group rankings
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

// 第三名分配：按小组配对
const thirdGroupMap: Record<number, string> = {
  74: 'D', 77: 'F', 79: 'E', 80: 'K',
  81: 'B', 82: 'I', 85: 'J', 87: 'L',
}
const assigned = new Map<number, TeamScores>()
for (const [matchId, g] of Object.entries(thirdGroupMap)) {
  const third = groupRanked.get(g)?.[2]
  if (third) assigned.set(Number(matchId), third)
}

// 3. Define R32 matchups (same as BracketView / ScheduleView)
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

// 4. Build match list and predict each
const r32Dates = ['6月28日', '6月29日', '6月30日', '7月1日']

console.log('// ── 32强淘汰赛 · 尉缭子分析法封存预测 ────────────')
console.log('export const KNOCKOUT_PREDICTIONS: Record<string, string> = {')

let matchIndex = 0
for (let m = 73; m <= 88; m++) {
  const def = matchDefs[m]
  if (!def) continue
  const [homeSlot, awaySlot] = def
  const home = resolveSlot(homeSlot)
  const away = resolveSlot(awaySlot)
  if (!home || !away) continue

  const date = r32Dates[matchIndex % r32Dates.length]
  const kr = predictFullKnockoutResult(home.total, away.total)
  const finalScore = kr.afterExtraTime ?? kr.regular

  const homeName = home.teamNameCN
  const awayName = away.teamNameCN
  const homeId = home.teamId
  const awayId = away.teamId

  const winnerName = kr.winner === 'home' ? homeName : awayName
  const stage = kr.hasPenalties ? '点球' : kr.hasExtraTime ? '加时' : '常规'

  console.log(`  // 第${matchIndex + 1}场: ${homeName} vs ${awayName} — ${date}`)
  console.log(`  //   常规 ${kr.regular[0]}-${kr.regular[1]}`)
  if (kr.hasExtraTime && kr.afterExtraTime) {
    console.log(`  //   加时 ${kr.afterExtraTime[0]}-${kr.afterExtraTime[1]}`)
  }
  if (kr.hasPenalties && kr.penalties) {
    console.log(`  //   点球 ${kr.penalties[0]}-${kr.penalties[1]}`)
  }
  console.log(`  //   ${winnerName} 晋级 (${stage})`)
  console.log(`  'r32-${matchIndex}': '${finalScore[0]}-${finalScore[1]}',`)
  console.log()
  matchIndex++
}

console.log('}')
console.log()
console.log('// ── 模型标签 ─────────────────────────────────────')
console.log('export function knockoutModelTag(matchId: string): string {')
console.log("  return matchId.startsWith('r32-') || matchId.startsWith('r16-') ||")
console.log("    matchId.startsWith('qf-') || matchId.startsWith('sf-') ||")
console.log("    matchId.startsWith('3rd-') || matchId.startsWith('final-')")
console.log("    ? '尉缭子分析法' : ''")
console.log('}')

// Also output individual match details
console.log()
console.log('// ── 详细结果 (含分段) ────────────────────────────')
console.log('export interface KnockoutDetail {')
console.log("  regular: [number, number]")
console.log("  afterExtraTime?: [number, number]")
console.log("  penalties?: [number, number]")
console.log("  winner: string")
console.log("  homeId: string")
console.log("  awayId: string")
console.log("  homeNameCN: string")
console.log("  awayNameCN: string")
console.log('}')
console.log()
console.log('export const KNOCKOUT_DETAILS: Record<string, KnockoutDetail> = {')

matchIndex = 0
for (let m = 73; m <= 88; m++) {
  const def = matchDefs[m]
  if (!def) continue
  const [homeSlot, awaySlot] = def
  const home = resolveSlot(homeSlot)
  const away = resolveSlot(awaySlot)
  if (!home || !away) continue

  const kr = predictFullKnockoutResult(home.total, away.total)

  console.log(`  'r32-${matchIndex}': {`)
  console.log(`    regular: [${kr.regular[0]}, ${kr.regular[1]}],`)
  if (kr.hasExtraTime && kr.afterExtraTime) {
    console.log(`    afterExtraTime: [${kr.afterExtraTime[0]}, ${kr.afterExtraTime[1]}],`)
  }
  if (kr.hasPenalties && kr.penalties) {
    console.log(`    penalties: [${kr.penalties[0]}, ${kr.penalties[1]}],`)
  }
  console.log(`    winner: '${kr.winner === 'home' ? home.teamId : away.teamId}',`)
  console.log(`    homeId: '${home.teamId}',`)
  console.log(`    awayId: '${away.teamId}',`)
  console.log(`    homeNameCN: '${home.teamNameCN}',`)
  console.log(`    awayNameCN: '${away.teamNameCN}',`)
  console.log('  },')
  matchIndex++
}

console.log('}')
