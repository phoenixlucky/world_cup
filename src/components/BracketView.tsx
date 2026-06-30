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
    const settlePair = (home: TeamScores, away: TeamScores, isR32: boolean): MatchResult => {
      let winner: string
      let label: string
      let actualScore: string | undefined

      if (isR32) {
        const key = `${home.teamId}-${away.teamId}`
        const r32id = pairToR32.get(key) || pairToR32.get(`${away.teamId}-${home.teamId}`)
        if (r32id && LIVE_SCORES[r32id]) {
          actualScore = LIVE_SCORES[r32id]
          const [hS, aS] = actualScore.split('-').map(Number)
          if (hS > aS) winner = home.teamId
          else if (aS > hS) winner = away.teamId
          else {
            // 平局 → 点球决胜：查实际点球胜方，没有则用预测
            const penWinner = R32_PENALTY_WINNERS[r32id] || KNOCKOUT_WINNERS[r32id]?.winner
            winner = penWinner === 'home' ? home.teamId : away.teamId
          }
          label = actualScore
        } else {
          winner = home.total >= away.total ? home.teamId : away.teamId
          label = '预测'
        }
      } else {
        winner = home.total >= away.total ? home.teamId : away.teamId
        label = '预测'
      }
      return { home, away, winner, label, actualScore }
    }

    const r32 = pairs.map(p => settlePair(p[0], p[1], true))

    // Subsequent rounds: winners face each other in bracket order
    const nextRound = (matches: MatchResult[]) => {
      const next: MatchResult[] = []
      for (let i = 0; i < matches.length; i += 2) {
        const a = matches[i]; const b = matches[i + 1]
        if (!a || !b) continue
        const h = smap.get(a.winner); const aw = smap.get(b.winner)
        if (h && aw) next.push(settlePair(h, aw, false))
      }
      return next
    }

    return [r32, nextRound(r32), nextRound(nextRound(r32)), nextRound(nextRound(nextRound(r32))), nextRound(nextRound(nextRound(nextRound(r32))))].filter(r => r.length > 0)
  }, [scores, standings])

  const roundNames = ['32 强', '16 强', '四分之一决赛', '半决赛', '决赛']

  if (bracket.length === 0) {
    return <div className="text-slate-500 text-sm p-4">暂无淘汰赛数据</div>
  }

  return (
    <div className="space-y-8">
      {bracket.map((round, ri) => {
        const isLast = ri === bracket.length - 1
        const isR32 = ri === 0

        return (
          <div key={ri} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                isLast ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
              }`}>{roundNames[ri]}</span>
              <span className="text-xs text-slate-500">{round.length} 场</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {isR32
                ? round.map((m: MatchResult, i: number) => {
                    const homeWon = m.winner === m.home.teamId
                    return (
                      <div key={`r32-${i}`} className="bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`flex items-center gap-1.5 min-w-0 flex-1 ${homeWon ? 'text-green-400' : 'text-white/70'}`}>
                            <FlagImg code={m.home.flagCode} size={18} />
                            <span className="text-xs font-medium truncate">{m.home.teamNameCN}</span>
                            {homeWon && <span className="text-green-400 text-[10px]">✓</span>}
                          </span>

                          {m.actualScore
                            ? <span className="font-bold text-sm font-mono mx-1.5 shrink-0 text-green-400">{m.actualScore}</span>
                            : <span className="text-slate-600 text-xs font-mono mx-1.5 shrink-0">vs</span>
                          }

                          <span className={`flex items-center gap-1.5 min-w-0 flex-1 justify-end ${!homeWon ? 'text-green-400' : 'text-white/70'}`}>
                            {!homeWon && <span className="text-green-400 text-[10px]">✓</span>}
                            <span className="text-xs font-medium truncate">{m.away.teamNameCN}</span>
                            <FlagImg code={m.away.flagCode} size={18} />
                          </span>
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-slate-600 font-mono">
                          <span>{m.home.total.toFixed(0)}</span>
                          <span>{m.actualScore ? '实际比分' : m.label}</span>
                          <span>{m.away.total.toFixed(0)}</span>
                        </div>
                      </div>
                    )
                  })
                : round.map((m: MatchResult, i: number) => {
                    const t = smap.get(m.winner)
                    if (!t) return null
                    return (
                      <div key={`r${ri}-${i}`}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                          ri + 1 < bracket.length
                            ? 'bg-green-900/20 border-green-700/50'
                            : 'bg-gradient-to-r from-yellow-600/20 to-amber-600/20 border-yellow-500/50'
                        }`}
                      >
                        <FlagImg code={t.flagCode} size={22} />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-white truncate block">{t.teamNameCN}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{m.home.teamNameCN} vs {m.away.teamNameCN}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400">{t.total.toFixed(0)}</span>
                        {ri + 1 < bracket.length && <span className="text-green-400 text-xs ml-1">✓</span>}
                        {ri + 1 >= bracket.length && <span className="text-yellow-400 text-xs ml-1">🏆</span>}
                      </div>
                    )
                  })
              }
            </div>
          </div>
        )
      })}
    </div>
  )
}
