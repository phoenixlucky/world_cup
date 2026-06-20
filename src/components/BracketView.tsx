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

    const groupWinners: TeamScores[] = []
    const runnersUp: TeamScores[] = []
    const thirdPlace: TeamScores[] = []

    for (const [g, gTeams] of groups) {
      const groupSt = standings.get(g)
      if (groupSt) {
        // Use standings order (actualPts → predPts → GD → GF)
        const rankMap = new Map(groupSt.map((s, i) => [s.teamId, i]))
        const sorted = [...gTeams].sort(
          (a, b) => (rankMap.get(a.teamId) ?? 99) - (rankMap.get(b.teamId) ?? 99)
        )
        if (sorted[0]) groupWinners.push(sorted[0])
        if (sorted[1]) runnersUp.push(sorted[1])
        if (sorted[2]) thirdPlace.push(sorted[2])
      } else {
        // Fallback: sort by total
        const sorted = [...gTeams].sort((a, b) => b.total - a.total)
        if (sorted[0]) groupWinners.push(sorted[0])
        if (sorted[1]) runnersUp.push(sorted[1])
        if (sorted[2]) thirdPlace.push(sorted[2])
      }
    }

    // Sort each tier by standings pts
    const byPts = (t: TeamScores) => standings.get(t.group)?.find(s => s.teamId === t.teamId)?.pts ?? 0

    groupWinners.sort((a, b) => byPts(b) - byPts(a))
    runnersUp.sort((a, b) => byPts(b) - byPts(a))
    // Top 8 third-placed teams (by standings pts)
    thirdPlace.sort((a, b) => byPts(b) - byPts(a))
    const bestThird = thirdPlace.slice(0, 8)

    // Realistic Round of 32 bracket:
    //   Tier A (best 8 group winners) vs Tier C (8 third-placed)
    //   Tier B (remaining 4 group winners) vs best 4 runners-up
    //   Tier D (remaining 8 runners-up) paired against each other
    const tierA = groupWinners.slice(0, 8)       // top 8 winners
    const tierB = groupWinners.slice(8)           // bottom 4 winners
    const tierC = bestThird                       // 8 third-placed
    const tierD = runnersUp.slice(4)              // bottom 8 runners-up (after removing top 4)

    // Build round of 32 in bracket order
    const r32: TeamScores[] = []
    // Matches 1-8: winner vs third
    for (let i = 0; i < 8; i++) {
      if (tierA[i]) r32.push(tierA[i])
      if (tierC[i]) r32.push(tierC[i])
    }
    // Matches 9-12: remaining winners vs top runners-up
    for (let i = 0; i < 4; i++) {
      if (tierB[i]) r32.push(tierB[i])
      if (runnersUp[i]) r32.push(runnersUp[i])
    }
    // Matches 13-16: remaining runners-up vs each other
    for (let i = 0; i < 8; i += 2) {
      if (tierD[i]) r32.push(tierD[i])
      if (tierD[i + 1]) r32.push(tierD[i + 1])
    }

    // Create pairs for display
    const pairs: [TeamScores, TeamScores][] = []
    for (let i = 0; i < r32.length; i += 2) {
      if (i + 1 < r32.length) pairs.push([r32[i], r32[i + 1]])
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
