/**
 * debug-bracket.ts — Print group standings and R32 bracket matchups
 *
 * Run: npx tsx scripts/debug-bracket.ts
 */
import { teams } from '../src/data/teams'
import { LIVE_SCORES } from '../src/data/results'
import { computeScores, DEFAULT_WEIGHTS, type TeamScores } from '../src/engine/scorer'
import { computeAllStandings } from '../src/engine/standings'

const scores = computeScores(teams, DEFAULT_WEIGHTS)
const standings = computeAllStandings(scores, LIVE_SCORES)

// Print group standings
console.log('=== 小组最终排名 ===')
for (const [g, gSt] of standings) {
  console.log(`\n${g}组:`)
  for (let i = 0; i < gSt.length; i++) {
    const s = gSt[i]
    const t = scores.find(t => t.teamId === s.teamId)
    console.log(`  ${i+1}. ${t?.teamNameCN ?? s.teamId} (${t?.teamName ?? ''}) — ${s.pts}pts GF${s.gf} GA${s.ga} GD${s.gd}`)
  }
}

// Build bracket
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

// Sort third-placed teams
allThird.sort((a, b) => {
  if (b.pts !== a.pts) return b.pts - a.pts
  if (b.gd !== a.gd) return b.gd - a.gd
  return b.gf - a.gf
})

// Print third-placed ranking
console.log('\n=== 第三名排名 (前8晋级) ===')
for (let i = 0; i < allThird.length; i++) {
  const t = allThird[i]
  console.log(`  ${i+1}. ${t.team.teamNameCN} — ${t.pts}pts GD${t.gd} GF${t.gf}`)
}

const bestThird = allThird.slice(0, 8)
console.log(`\n晋级32强的小组第三:`)
for (const t of bestThird) {
  console.log(`  ${t.team.teamNameCN} (${t.team.group}组)`)
}

// Assign third-placed teams to matches
const thirdMatchOrder = [74, 77, 79, 80, 81, 82, 85, 87]
const assigned = new Map<number, TeamScores>()
for (let i = 0; i < Math.min(bestThird.length, 8); i++) {
  assigned.set(thirdMatchOrder[i], bestThird[i].team)
}

// Match definitions
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

console.log('\n=== 32强对阵 ===')
const r32Dates = ['6月28日', '6月29日', '6月30日', '7月1日']

let matchIndex = 0
for (let m = 73; m <= 88; m++) {
  const def = matchDefs[m]
  if (!def) continue
  const [homeSlot, awaySlot] = def
  const home = resolveSlot(homeSlot)
  const away = resolveSlot(awaySlot)
  const date = r32Dates[matchIndex % r32Dates.length]
  
  const homeName = home?.teamNameCN ?? homeSlot
  const awayName = away?.teamNameCN ?? awaySlot
  console.log(`  第${matchIndex+1}场: ${homeName} vs ${awayName} (${homeSlot} vs ${awaySlot}) — ${date}`)
  matchIndex++
}
