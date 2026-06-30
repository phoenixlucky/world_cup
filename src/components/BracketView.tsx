/**
 * BracketView — 32-team knockout bracket visualisation
 *
 * Uses the actual tournament bracket pairings (R32_MATCHUPS) for round 1.
 * Completed matches show real scores from LIVE_SCORES; remaining rounds
 * are simulated by team strength scores.
 */
import { useMemo } from 'react'
import type { TeamScores } from '../engine/scorer'
import { LIVE_SCORES, KNOCKOUT_WINNERS } from '../data/results'
import { FlagImg } from './FlagImg'

// 实际32强对阵表（尉缭子分析法生成的官方对阵）
const R32_MATCHUPS: [string, string][] = [
  ['south-africa', 'canada'],          // r32-0
  ['germany', 'paraguay'],             // r32-1
  ['netherlands', 'morocco'],          // r32-2
  ['brazil', 'japan'],                 // r32-3
  ['france', 'sweden'],                // r32-4
  ['ivory-coast', 'norway'],           // r32-5
  ['mexico', 'ecuador'],               // r32-6
  ['england', 'dr-congo'],             // r32-7
  ['usa', 'bosnia'],                   // r32-8
  ['belgium', 'senegal'],              // r32-9
  ['portugal', 'croatia'],             // r32-10
  ['spain', 'austria'],                // r32-11
  ['switzerland', 'algeria'],          // r32-12
  ['argentina', 'cape-verde'],         // r32-13
  ['colombia', 'ghana'],               // r32-14
  ['australia', 'egypt'],              // r32-15
]

interface Props {
  scores: TeamScores[]
}

export function BracketView({ scores }: Props) {
  const smap = new Map(scores.map(s => [s.teamId, s]))

  // Resolve a team ID to TeamScores object
  const resolve = (id: string) => smap.get(id)

  // Build bracket rounds from R32_MATCHUPS
  const bracket = useMemo(() => {
    type MatchResult = {
      home: TeamScores | undefined
      away: TeamScores | undefined
      winner: string | null        // teamId of the winner
      isActual: boolean           // true if winner from LIVE_SCORES
      actualScore?: string        // from LIVE_SCORES
    }

    // Round 1: use R32_MATCHUPS
    const round1: MatchResult[] = R32_MATCHUPS.map(([homeId, awayId], i) => {
      const home = resolve(homeId)
      const away = resolve(awayId)
      const r32id = `r32-${i}`
      const actualScore = LIVE_SCORES[r32id]
      let winner: string | null = null
      let isActual = false

      if (actualScore && home && away) {
        // 实际结果决定晋级方
        const [hS, aS] = actualScore.split('-').map(Number)
        if (hS > aS) winner = homeId
        else if (aS > hS) winner = awayId
        else {
          // 平局 → 点球，查 KNOCKOUT_WINNERS
          const kw = KNOCKOUT_WINNERS[r32id]
          if (kw) winner = kw.winner === 'home' ? homeId : awayId
          else winner = home.total >= away.total ? homeId : awayId
        }
        isActual = true
      } else if (home && away) {
        // 无实际结果，按评分预测
        winner = home.total >= away.total ? homeId : awayId
      }

      return { home, away, winner, isActual, actualScore }
    })

    // Helper: advance winners to next round
    function nextRound(matches: MatchResult[]): MatchResult[] {
      const next: MatchResult[] = []
      for (let i = 0; i < matches.length; i += 2) {
        const a = matches[i]
        const b = matches[i + 1]
        if (!a || !b) continue
        const homeId = a.winner
        const awayId = b.winner
        const home = homeId ? resolve(homeId) : undefined
        const away = awayId ? resolve(awayId) : undefined
        let winner: string | null = null
        if (home && away) {
          winner = home.total >= away.total ? homeId : awayId
        } else if (home) {
          winner = homeId
        } else if (away) {
          winner = awayId
        }
        next.push({ home, away, winner, isActual: false })
      }
      return next
    }

    const round2 = nextRound(round1)
    const round3 = nextRound(round2)
    const round4 = nextRound(round3)
    const round5 = nextRound(round4)  // final

    return [round1, round2, round3, round4, round5].filter(r => r.length > 0)
  }, [scores])

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
                isLast
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {roundNames[ri] || `第${ri + 1}轮`}
              </span>
              <span className="text-xs text-slate-500">{round.length} 场</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {ri === 0
                ? /* Round 1: show match cards with score vs prediction */
                  round.map((m, i) => {
                    const { home, away, winner, isActual, actualScore } = m
                    if (!home || !away) return null
                    const homeWon = winner === home.teamId
                    const r32id = `r32-${i}`
                    return (
                      <div key={r32id} className="bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`flex items-center gap-1.5 min-w-0 flex-1 ${homeWon ? 'text-green-400' : 'text-white/70'}`}>
                            <FlagImg code={home.flagCode} size={18} />
                            <span className="text-xs font-medium truncate">{home.teamNameCN}</span>
                            {homeWon && <span className="text-green-400 text-[10px]">✓</span>}
                          </span>

                          {actualScore
                            ? <span className={`font-bold text-sm font-mono mx-1.5 shrink-0 ${isActual ? 'text-green-400' : 'text-orange-400'}`}>
                                {actualScore}
                              </span>
                            : <span className="text-slate-600 text-xs font-mono mx-1.5 shrink-0">vs</span>
                          }

                          <span className={`flex items-center gap-1.5 min-w-0 flex-1 justify-end ${!homeWon && winner ? 'text-green-400' : 'text-white/70'}`}>
                            {!homeWon && winner && <span className="text-green-400 text-[10px]">✓</span>}
                            <span className="text-xs font-medium truncate">{away.teamNameCN}</span>
                            <FlagImg code={away.flagCode} size={18} />
                          </span>
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-slate-600 font-mono">
                          <span>{home.total.toFixed(0)}</span>
                          <span>{isActual ? '实际比分' : '预测'}</span>
                          <span>{away.total.toFixed(0)}</span>
                        </div>
                      </div>
                    )
                  })
                : /* Rounds 2+: show winners as team cards */
                  round.map((m, i) => {
                    const { home, away, winner } = m
                    if (!winner) return null
                    const t = resolve(winner)
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
                          <span className="text-sm font-medium text-white truncate block">
                            {t.teamNameCN}
                          </span>
                          {home && away && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {home.teamNameCN} vs {away.teamNameCN}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {t.total.toFixed(0)}
                        </span>
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

      {/* Champion */}
      {bracket.length > 0 && (() => {
        const lastRound = bracket[bracket.length - 1]
        if (lastRound.length !== 1) return null
        const final = lastRound[0]
        if (!final.winner) return null
        const c = resolve(final.winner)
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
