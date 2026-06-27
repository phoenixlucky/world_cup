/**
 * ThirdPlacePage — group third-place ranking page
 *
 * Shows all 12 groups' third-place teams ranked by points, with
 * 排名, 组别, 球队, 已赛场次, 积分, 胜/平/负, 进/失球
 */
import { useState, useMemo } from 'react'
import { useTeamData } from '../hooks/useTeamData'
import { computeScores, DEFAULT_WEIGHTS, type Weights } from '../engine/scorer'
import { computeAllStandings } from '../engine/standings'
import { LIVE_SCORES } from '../data/results'
import { WeightPanel } from '../components/WeightPanel'
import { ThirdPlaceRanking } from '../components/ThirdPlaceRanking'

export function ThirdPlacePage() {
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
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          🥉 小组第三排行榜
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          12 个小组第 3 名排名 · 前 8 名晋级 32 强
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <WeightPanel weights={weights} onChange={setWeights} />
        </div>
        <div className="lg:col-span-3">
          <ThirdPlaceRanking scores={scores} standings={standings} />
        </div>
      </div>
    </div>
  )
}
