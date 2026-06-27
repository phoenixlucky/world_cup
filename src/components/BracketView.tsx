/**
 * BracketView — 32-team knockout bracket visualisation
 *
 * Simplified view showing the bracket structure with predicted winners
 * based on team scores.
 */
import { useMemo } from 'react'
import type { TeamScores } from '../engine/scorer'
import type { GroupStanding } from '../engine/standings'
import { FlagImg } from './FlagImg'

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
    const allThird: { team: TeamScores; pts: number; gd: number; gf: number }[] = []
    for (const [g, ranked] of groupRanked) {
      if (ranked[0]) slotMap.set(`${g}1`, ranked[0])
      if (ranked[1]) slotMap.set(`${g}2`, ranked[1])
      if (ranked[2]) {
        const st = standings.get(g)?.find(s => s.teamId === ranked[2].teamId)
        allThird.push({ team: ranked[2], pts: st?.pts ?? 0, gd: st?.gd ?? 0, gf: st?.gf ?? 0 })
      }
    }
    // Best 8 third-placed teams: sort by pts → GD → GF (matching ThirdPlaceRanking)
    allThird.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.gd !== a.gd) return b.gd - a.gd
      return b.gf - a.gf
    })
    const bestThird = allThird.slice(0, 8)

    // Assign 8 best third-placed teams to the 8 third-placed slots by rank
    // (best 3rd → match 74, 2nd best → match 77, ...)
    const thirdMatchOrder = [74, 77, 79, 80, 81, 82, 85, 87]
    const assigned = new Map<number, TeamScores>()
    for (let i = 0; i < Math.min(bestThird.length, 8); i++) {
      assigned.set(thirdMatchOrder[i], bestThird[i].team)
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

  // Simulate rounds: winner decided by comprehensive strength (total score)
  const predictedChampion = useMemo(() => {
    const smap = new Map(scores.map(s => [s.teamId, s]))
    let currentRound = bracket.sorted.map(s => s.teamId)
    const rounds: string[][] = [currentRound]

    while (currentRound.length > 1) {
      const nextRound: string[] = []
      for (let i = 0; i < currentRound.length; i += 2) {
        const a = smap.get(currentRound[i])
        const b = smap.get(currentRound[i + 1])
        if (a && b) {
          nextRound.push(a.total >= b.total ? a.teamId : b.teamId)
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
              {round.map(teamId => {
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
