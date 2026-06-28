/**
 * Round32Page — 32强赛程 (Round of 32 schedule page)
 */
import { useState, useMemo } from 'react'
import { useTeamData } from '../hooks/useTeamData'
import { computeScores, DEFAULT_WEIGHTS, type Weights } from '../engine/scorer'
import { computeAllStandings } from '../engine/standings'
import { LIVE_SCORES } from '../data/results'
import { WeightPanel } from '../components/WeightPanel'
import { Round32View } from '../components/Round32View'

export function Round32Page() {
  const { teams } = useTeamData()
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS)

  const scores = useMemo(
    () => computeScores(teams, weights),
    [teams, weights],
  )

  const standings = useMemo(() => {
    let liveScores: Record<string, string> = {}
    try {
      liveScores = JSON.parse(localStorage.getItem('wc26-scores') || '{}')
    } catch {}
    liveScores = { ...LIVE_SCORES, ...liveScores }
    return computeAllStandings(scores, liveScores)
  }, [scores])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">🏆 32强赛程</h1>
        <p className="text-slate-400 text-sm mt-1">
          2026 世界杯 32 强淘汰赛对阵 · 6月28日–7月1日 · 基于小组赛排名确定对阵
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <WeightPanel weights={weights} onChange={setWeights} />
        </div>
        <div className="lg:col-span-3">
          <Round32View scores={scores} standings={standings} />
        </div>
      </div>
    </div>
  )
}
