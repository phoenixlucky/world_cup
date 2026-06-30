/**
 * BracketView — 32-team knockout bracket visualisation
 *
 * Simplified view showing the bracket structure with predicted winners
 * based on team scores.
 */
import { useMemo, type ReactNode } from 'react'
import type { TeamScores } from '../engine/scorer'
import type { GroupStanding } from '../engine/standings'
import { LIVE_SCORES, KNOCKOUT_WINNERS } from '../data/results'
import { FlagImg } from './FlagImg'

// 32 强对阵表: [homeId, awayId] → r32-N
const R32_MATCHUPS: [string, string][] = [
  ['south-africa', 'canada'],
  ['germany', 'paraguay'],
  ['netherlands', 'morocco'],
  ['brazil', 'japan'],
  ['france', 'sweden'],
  ['ivory-coast', 'norway'],
  ['mexico', 'ecuador'],
  ['england', 'dr-congo'],
  ['usa', 'bosnia'],
  ['belgium', 'senegal'],
  ['portugal', 'croatia'],
  ['spain', 'austria'],
  ['switzerland', 'algeria'],
  ['argentina', 'cape-verde'],
  ['colombia', 'ghana'],
  ['australia', 'egypt'],
]

// Build team-pair → r32-N lookup
const teamPairToR32 = new Map<string, string>()
R32_MATCHUPS.forEach(([h, a], i) => {
  teamPairToR32.set(`${h}-${a}`, `r32-${i}`)
  teamPairToR32.set(`${a}-${h}`, `r32-${i}`) // either order
})

interface Props {
  scores: TeamScores[]
  standings: Map<string, GroupStanding[]>
}

export function BracketView({ scores, standings }: Props) {
  // Seed the 32 knockout teams: group winners + runners-up + best 8 thirds
  const bracket = useMemo(() => {
    // Group teams
    const groups = new Map<string, TeamScores[]>()
    for (const s of scores) {
      if (!groups.has(s.group)) groups.set(s.group, [])
      groups.get(s.group)!.push(s)
    }

    // Build per-group standings: [1st, 2nd, 3rd, 4th] by standings order
    const groupRanked = new Map<string, TeamScores[]>()
    for (const [g, gTeams] of groups) {
      const groupSt = standings.get(g)
      if (groupSt) {
        const rankMap = new Map(groupSt.map((s, i) => [s.teamId, i]))
        const sorted = [...gTeams].sort(
          (a, b) => (rankMap.get(a.teamId) ?? 99) - (rankMap.get(b.teamId) ?? 99)
        )
        groupRanked.set(g, sorted)
      } else {
        groupRanked.set(g, [...gTeams].sort((a, b) => b.total - a.total))
      }
    }

    // Slot lookup: "A1" → group A winner, "A2" → runner-up, etc.
    const slotMap = new Map<string, TeamScores>()
    for (const [g, ranked] of groupRanked) {
      if (ranked[0]) slotMap.set(`${g}1`, ranked[0])
      if (ranked[1]) slotMap.set(`${g}2`, ranked[1])
    }

    // Assign 8 third-placed teams to specific match slots by group
    const thirdGroupMap: Record<number, string> = {
      74: 'D', 77: 'F', 79: 'E', 80: 'K',
      81: 'B', 82: 'I', 85: 'J', 87: 'L',
    }
    const assigned = new Map<number, TeamScores>()
    for (const [matchId, g] of Object.entries(thirdGroupMap)) {
      const third = groupRanked.get(g)?.[2]
      if (third) assigned.set(Number(matchId), third)
    }

    // Exact 32强 bracket (2026 FIFA World Cup format)
    // Define each match by its home/away slot
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

    // Build bracket in order
    const resolveSlot = (slot: string): TeamScores | undefined => {
      if (/^[A-L][12]$/.test(slot)) return slotMap.get(slot)
      return scores.find(s => s.teamId === slot)
    }

    const r32: TeamScores[] = []
    const pairs: [TeamScores, TeamScores][] = []
    for (let m = 73; m <= 88; m++) {
      const def = matchDefs[m]
      if (!def) continue
      const [homeSlot, awaySlot] = def
      const home = resolveSlot(homeSlot)
      const away = resolveSlot(awaySlot)
      if (!home || !away) continue
      r32.push(home)
      r32.push(away)
      pairs.push([home, away])
    }

    return { sorted: r32, pairs }
  }, [scores, standings])

  const roundName = (round: number) => {
    switch (round) {
      case 1: return '32 强'
      case 2: return '16 强'
      case 3: return '四分之一决赛'
      case 4: return '半决赛'
      case 5: return '决赛'
      default: return ''
    }
  }

  // Simulate rounds: use actual r32 results where available, else predict by strength
  const predictedChampion = useMemo(() => {
    const smap = new Map(scores.map(s => [s.teamId, s]))
    let currentRound = bracket.sorted.map(s => s.teamId)
    const rounds: string[][] = [currentRound]

    while (currentRound.length > 1) {
      const nextRound: string[] = []
      const isFirstRound = currentRound.length === 32
      for (let i = 0; i < currentRound.length; i += 2) {
        const a = smap.get(currentRound[i])
        const b = smap.get(currentRound[i + 1])
        if (a && b) {
          let winner: string | null = null
          // First round: use actual result from LIVE_SCORES if available
          if (isFirstRound) {
            const pairKey = `${a.teamId}-${b.teamId}`
            const r32id = teamPairToR32.get(pairKey)
            if (r32id) {
              const actual = LIVE_SCORES[r32id]
              if (actual) {
                const [hS, aS] = actual.split('-').map(Number)
                // Determine which team is home in the r32 matchup
                const matchup = R32_MATCHUPS.find(([h]) => h === a.teamId || h === b.teamId)
                if (matchup) {
                  const homeId = matchup[0]
                  const awayId = matchup[1]
                  const homeIsA = a.teamId === homeId
                  const homeScore = homeIsA ? hS : aS
                  const awayScore = homeIsA ? aS : hS
                  if (homeScore > awayScore) winner = homeId
                  else if (awayScore > homeScore) winner = awayId
                  else {
                    // 平局 → 点球决胜：取 KNOCKOUT_WINNERS 或更高评分球队
                    const kw = KNOCKOUT_WINNERS[r32id]
                    if (kw) winner = kw.winner === 'home' ? homeId : awayId
                    else winner = a.total >= b.total ? a.teamId : b.teamId
                  }
                }
              }
            }
          }
          if (!winner) {
            winner = a.total >= b.total ? a.teamId : b.teamId
          }
          nextRound.push(winner)
        } else {
          nextRound.push(a ? a.teamId : b!.teamId)
        }
      }
      rounds.push(nextRound)
      currentRound = nextRound
    }

    return { rounds, champion: currentRound[0] }
  }, [bracket, scores])

  const smap = new Map(scores.map(s => [s.teamId, s]))

  // Lookup actual r32 scores for display on bracket
  const matchScores = useMemo(() => {
    const scores = new Map<number, string>()
    for (let i = 0; i < bracket.pairs.length; i++) {
      const [home, away] = bracket.pairs[i]
      const r32id = teamPairToR32.get(`${home.teamId}-${away.teamId}`) ||
                    teamPairToR32.get(`${away.teamId}-${home.teamId}`)
      if (r32id && LIVE_SCORES[r32id]) scores.set(i, LIVE_SCORES[r32id])
    }
    return scores
  }, [bracket.pairs])

  return (
    <div className="space-y-8">
      {predictedChampion.rounds.map((round, ri) => {
        const isLast = ri === predictedChampion.rounds.length - 1

        return (
          <div key={ri} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                isLast
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {roundName(ri + 1)}
              </span>
              <span className="text-xs text-slate-500">{round.length} 支队伍</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {ri === 0
                // Round 1 (32强): show match pairs with actual scores
                ? (() => {
                    const pairs: ReactNode[] = []
                    for (let i = 0; i < round.length; i += 2) {
                      const homeId = round[i]
                      const awayId = round[i + 1]
                      const home = smap.get(homeId)
                      const away = smap.get(awayId)
                      if (!home || !away) continue
                      const pairIdx = i / 2
                      const score = matchScores.get(pairIdx)
                      const isWinner = predictedChampion.rounds[ri + 1]?.includes(homeId) ||
                                       predictedChampion.rounds[ri + 1]?.includes(awayId)
                      const winnerId = isWinner
                        ? (predictedChampion.rounds[ri + 1]?.includes(homeId) ? homeId : awayId)
                        : null

                      pairs.push(
                        <div key={i} className="bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`flex items-center gap-1.5 min-w-0 flex-1 ${winnerId === homeId ? 'text-green-400' : 'text-white/70'}`}>
                              <FlagImg code={home.flagCode} size={18} />
                              <span className="text-xs font-medium truncate">{home.teamNameCN}</span>
                              {winnerId === homeId && <span className="text-green-400 text-[10px]">✓</span>}
                            </span>
                            {score
                              ? <span className="text-green-400 font-bold text-sm font-mono mx-1.5 shrink-0">{score}</span>
                              : <span className="text-slate-600 text-xs font-mono mx-1.5 shrink-0">vs</span>
                            }
                            <span className={`flex items-center gap-1.5 min-w-0 flex-1 justify-end ${winnerId === awayId ? 'text-green-400' : 'text-white/70'}`}>
                              {winnerId === awayId && <span className="text-green-400 text-[10px]">✓</span>}
                              <span className="text-xs font-medium truncate">{away.teamNameCN}</span>
                              <FlagImg code={away.flagCode} size={18} />
                            </span>
                          </div>
                          {home.total !== undefined && away.total !== undefined && (
                            <div className="flex justify-between mt-1 text-[10px] text-slate-600 font-mono">
                              <span>{home.total.toFixed(0)}</span>
                              <span>{away.total.toFixed(0)}</span>
                            </div>
                          )}
                        </div>
                      )
                    }
                    return pairs
                  })()
                : round.map(teamId => {
                const t = smap.get(teamId)
                if (!t) return null
                const isWinner = isLast || (
                  ri + 1 < predictedChampion.rounds.length &&
                  predictedChampion.rounds[ri + 1].includes(teamId)
                )

                return (
                  <div
                    key={teamId}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      isWinner
                        ? 'bg-green-900/20 border-green-700/50'
                        : 'bg-slate-900/40 border-slate-700'
                    }`}
                  >
                    <FlagImg code={t.flagCode} size={22} />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-white truncate block">
                        {t.teamNameCN}
                      </span>
                    </div>
                    <span className={`text-xs font-mono font-bold ${
                      t.total >= 70 ? 'text-green-400' : 'text-slate-400'
                    }`}>
                      {t.total.toFixed(0)}
                    </span>
                    {isWinner && !isLast && (
                      <span className="text-green-400 text-xs">✓</span>
                    )}
                    {isLast && (
                      <span className="text-yellow-400 text-xs">🏆</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Champion */}
      {predictedChampion.champion && (() => {
        const c = smap.get(predictedChampion.champion)
        return c ? (
          <div className="bg-gradient-to-r from-yellow-600/20 to-amber-600/20 border border-yellow-500/50 rounded-xl p-6 text-center">
            <p className="text-sm text-yellow-400 mb-2">🏆 预测冠军</p>
            <FlagImg code={c.flagCode} size={40} className="mr-3" />
            <span className="text-2xl font-bold text-white">{c.teamNameCN}</span>
            <p className="text-slate-400 mt-1">{c.teamName} — 综合评分 {c.total.toFixed(1)}</p>
          </div>
        ) : null
      })()}
    </div>
  )
}
