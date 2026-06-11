/**
 * KnockoutPage — bracket view
 */
import { useState, useMemo } from 'react'
import { useTeamData } from '../hooks/useTeamData'
import { computeScores, DEFAULT_WEIGHTS, type Weights } from '../engine/scorer'
import { WeightPanel } from '../components/WeightPanel'
import { BracketView } from '../components/BracketView'

export function KnockoutPage() {
  const { teams } = useTeamData()
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS)

  const scores = useMemo(
    () => computeScores(teams, weights),
    [teams, weights],
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">🏆 淘汰赛预测</h1>
        <p className="text-slate-400 text-sm mt-1">32 强单败淘汰 · 基于综合评分模拟各轮晋级结果</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <WeightPanel weights={weights} onChange={setWeights} />
        </div>
        <div className="lg:col-span-3">
          <BracketView scores={scores} />
        </div>
      </div>
    </div>
  )
}
