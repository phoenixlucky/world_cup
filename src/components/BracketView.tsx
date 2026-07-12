/**
 * BracketView — 32-team knockout bracket visualisation
 *
 * Pairings are based on the official 2026 FIFA World Cup bracket (slot-based).
 * Completed Round-1 matches use actual scores from LIVE_SCORES;
 * remaining rounds are simulated by team strength scores.
 */
import { useMemo } from 'react'
import type { TeamScores } from '../engine/scorer'
import type { GroupStanding } from '../engine/standings'
import { LIVE_SCORES, KNOCKOUT_WINNERS, R32_PENALTY_WINNERS } from '../data/results'
import { FlagImg } from './FlagImg'

// 32强team-pair → r32-N reverse mapping
const R32_MATCHUPS: [string, string][] = [
  ['south-africa', 'canada'],    ['germany', 'paraguay'],
  ['netherlands', 'morocco'],    ['brazil', 'japan'],
  ['france', 'sweden'],          ['ivory-coast', 'norway'],
  ['mexico', 'ecuador'],         ['england', 'dr-congo'],
  ['usa', 'bosnia'],             ['belgium', 'senegal'],
  ['portugal', 'croatia'],       ['spain', 'austria'],
  ['switzerland', 'algeria'],    ['argentina', 'cape-verde'],
  ['colombia', 'ghana'],         ['australia', 'egypt'],
]
const pairToR32 = new Map<string, string>()
R32_MATCHUPS.forEach(([h, a], i) => {
  pairToR32.set(`${h}-${a}`, `r32-${i}`)
  pairToR32.set(`${a}-${h}`, `r32-${i}`)
})

interface Props {
  scores: TeamScores[]
  standings: Map<string, GroupStanding[]>
}

interface MatchResult {
  home: TeamScores
  away: TeamScores
  winner: string
  label: string
  actualScore?: string
}

export function BracketView({ scores, standings }: Props) {
  const smap = new Map(scores.map(s => [s.teamId, s]))

  const bracket = useMemo(() => {
    // Group teams by group letter
    const groups = new Map<string, TeamScores[]>()
    for (const s of scores) {
      if (!groups.has(s.group)) groups.set(s.group, [])
      groups.get(s.group)!.push(s)
    }

    // Per-group ranking using standings
    const groupRanked = new Map<string, TeamScores[]>()
    for (const [g, gTeams] of groups) {
      const gs = standings.get(g)
      if (gs) {
        const rankMap = new Map(gs.map((s, i) => [s.teamId, i]))
        groupRanked.set(g, [...gTeams].sort((a, b) =>
          (rankMap.get(a.teamId) ?? 99) - (rankMap.get(b.teamId) ?? 99)))
      } else {
        groupRanked.set(g, [...gTeams].sort((a, b) => b.total - a.total))
      }
    }

    // Slot → team
    const slotMap = new Map<string, TeamScores>()
    for (const [g, ranked] of groupRanked) {
      if (ranked[0]) slotMap.set(`${g}1`, ranked[0])
      if (ranked[1]) slotMap.set(`${g}2`, ranked[1])
    }

    // 8 best 3rd-placed teams
    const thirdGroups: Record<number, string> = {
      74: 'D', 77: 'F', 79: 'E', 80: 'K',
      81: 'B', 82: 'I', 85: 'J', 87: 'L',
    }
    const assignedThird = new Map<number, TeamScores>()
    for (const [mid, g] of Object.entries(thirdGroups)) {
      const third = groupRanked.get(g)?.[2]
      if (third) assignedThird.set(Number(mid), third)
    }

    // Official 2026 bracket: 73–88 = 16 round-1 matches
    const matchDefs: Record<number, [string, string]> = {
      73: ['A2', 'B2'],                    // r32-0
      74: ['E1', assignedThird.get(74)?.teamId ?? ''],
      75: ['F1', 'C2'],                    // r32-?
      76: ['C1', 'F2'],
      77: ['I1', assignedThird.get(77)?.teamId ?? ''],
      78: ['E2', 'I2'],
      79: ['A1', assignedThird.get(79)?.teamId ?? ''],
      80: ['L1', assignedThird.get(80)?.teamId ?? ''],
      81: ['D1', assignedThird.get(81)?.teamId ?? ''],
      82: ['G1', assignedThird.get(82)?.teamId ?? ''],
      83: ['K2', 'L2'],
      84: ['H1', 'J2'],
      85: ['B1', assignedThird.get(85)?.teamId ?? ''],
      86: ['J1', 'H2'],
      87: ['K1', assignedThird.get(87)?.teamId ?? ''],
      88: ['D2', 'G2'],
    }
    const resolveSlot = (s: string): TeamScores | undefined =>
      /^[A-L][12]$/.test(s) ? slotMap.get(s) : scores.find(t => t.teamId === s)

    const pairs: [TeamScores, TeamScores][] = []
    for (let m = 73; m <= 88; m++) {
      const def = matchDefs[m]
      if (!def) continue
      const [hSlot, aSlot] = def
      const h = resolveSlot(hSlot)
      const a = resolveSlot(aSlot)
      if (h && a) pairs.push([h, a])
    }

    // Resolve winner for a given pair
    const settlePair = (home: TeamScores, away: TeamScores, roundKey: string, matchIdx: number): MatchResult => {
      let winner: string
      let label: string
      let actualScore: string | undefined

      // Check for actual result from LIVE_SCORES
      const scoreKey = roundKey === 'r32'
        ? (pairToR32.get(`${home.teamId}-${away.teamId}`) || pairToR32.get(`${away.teamId}-${home.teamId}`))
        : `${roundKey}-${matchIdx}`
      const storedScore = LIVE_SCORES[scoreKey || '']
      if (storedScore) {
        actualScore = storedScore
        const [hS, aS] = actualScore.split('-').map(Number)
        if (hS > aS) winner = home.teamId
        else if (aS > hS) winner = away.teamId
        else {
          // 平局 → 点球决胜：查实际点球胜方
          const penWinner = roundKey === 'r32' ? (R32_PENALTY_WINNERS[scoreKey!] || KNOCKOUT_WINNERS[scoreKey!]?.winner) : undefined
          winner = penWinner === 'away' ? away.teamId : home.teamId
        }
        label = actualScore
      } else {
        winner = home.total >= away.total ? home.teamId : away.teamId
        label = '预测'
      }
      return { home, away, winner, label, actualScore }
    }

    const r32 = pairs.map((p, i) => settlePair(p[0], p[1], 'r32', i))

    // Official 2026 bracket topology: which r32 indices feed into each R16 match
    const r16Topology: [number, number][] = [
      [0, 2], [1, 4], [3, 5], [6, 7],
      [10, 11], [8, 9], [13, 15], [12, 14],
    ]
    const qfTopology: [number, number][] = [[0, 1], [4, 5], [2, 3], [6, 7]]
    const sfTopology: [number, number][] = [[0, 1], [2, 3]]

    // Build subsequent rounds by applying the bracket topology
    const resolveRound = (prev: MatchResult[], topo: [number, number][], roundKey: string) =>
      topo.map(([aIdx, bIdx], i) => {
        const a = prev[aIdx]; const b = prev[bIdx]
        if (!a || !b) return null
        const h = smap.get(a.winner); const aw = smap.get(b.winner)
        if (!h || !aw) return null
        return settlePair(h, aw, roundKey, i)
      }).filter(Boolean) as MatchResult[]

    const r16 = resolveRound(r32, r16Topology, 'r16')
    const qf = resolveRound(r16, qfTopology, 'qf')
    const sf = resolveRound(qf, sfTopology, 'sf')
    const final = resolveRound(sf, [[0, 1]], 'final')

    return [r32, r16, qf, sf, final].filter(r => r.length > 0)
  }, [scores, standings])

  const roundNames = ['32 强', '16 强', '四分之一决赛', '半决赛', '决赛']

  if (bracket.length === 0) {
    return <div className="text-slate-500 text-sm p-4">暂无淘汰赛数据</div>
  }

  return (
    <div className="space-y-8">
      {bracket.map((round, ri) => {
        const isLast = ri === bracket.length - 1

        return (
          <div key={ri} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                isLast ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
              }`}>{roundNames[ri]}</span>
              <span className="text-xs text-slate-500">{round.length} 场</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {round.map((m: MatchResult, i: number) => {
                const homeWon = m.winner === m.home.teamId
                // Determine if this match has an actual result
                const isCompleted = !!m.actualScore
                return (
                  <div key={`r${ri}-${i}`}
                    className={`rounded-lg border px-3 py-2.5 transition-colors ${
                      isLast
                        ? 'bg-gradient-to-br from-yellow-600/15 to-amber-600/10 border-yellow-500/40'
                        : isCompleted
                          ? 'bg-green-900/20 border-green-700/40'
                          : 'bg-slate-900/40 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {/* Home team */}
                    <div className={`flex items-center gap-1.5 mb-1 ${homeWon ? '' : 'opacity-50'}`}>
                      <FlagImg code={m.home.flagCode} size={16} />
                      <span className="text-xs font-medium truncate flex-1">{m.home.teamNameCN}</span>
                      {homeWon && <span className="text-green-400 text-[10px] shrink-0">✓</span>}
                      <span className="text-[10px] text-slate-500 font-mono">{m.home.total.toFixed(0)}</span>
                    </div>

                    {/* Scoreline */}
                    <div className="flex items-center justify-center gap-2 my-1.5">
                      <div className="h-px flex-1 bg-slate-700/50" />
                      {isCompleted
                        ? <span className="font-bold text-sm font-mono text-green-400 px-2">{m.actualScore}</span>
                        : <span className="text-xs font-mono text-slate-500 px-2">vs</span>
                      }
                      <div className="h-px flex-1 bg-slate-700/50" />
                    </div>

                    {/* Away team */}
                    <div className={`flex items-center gap-1.5 mt-1 ${!homeWon ? '' : 'opacity-50'}`}>
                      <FlagImg code={m.away.flagCode} size={16} />
                      <span className="text-xs font-medium truncate flex-1">{m.away.teamNameCN}</span>
                      {!homeWon && <span className="text-green-400 text-[10px] shrink-0">✓</span>}
                      <span className="text-[10px] text-slate-500 font-mono">{m.away.total.toFixed(0)}</span>
                    </div>

                    {/* Prediction comparison for completed matches */}
                    {isCompleted && (
                      <div className="mt-1.5 text-[10px] text-slate-500 text-center font-mono">
                        实际比分
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Champion callout */}
      {bracket.length > 0 && (() => {
        const lastRound = bracket[bracket.length - 1]
        if (lastRound.length !== 1) return null
        const finalM = lastRound[0]
        if (!finalM.winner) return null
        const c = smap.get(finalM.winner)
        return c ? (
          <div className="bg-gradient-to-r from-yellow-600/20 via-amber-600/15 to-yellow-600/20 border border-yellow-500/40 rounded-xl p-5 text-center">
            <p className="text-sm text-yellow-400 mb-2">🏆 预测冠军</p>
            <div className="flex items-center justify-center gap-3">
              <FlagImg code={c.flagCode} size={32} />
              <span className="text-xl font-bold text-white">{c.teamNameCN}</span>
            </div>
            <p className="text-slate-400 text-xs mt-1">{c.teamName} — 综合评分 {c.total.toFixed(1)}</p>
          </div>
        ) : null
      })()}
    </div>
  )
}
