/**
 * HomePage — main rankings page with weight panel + team ranking table
 */
import { useState, useMemo } from 'react'
import { useTeamData } from '../hooks/useTeamData'
import { computeScores, sortScores, DEFAULT_WEIGHTS, type Weights } from '../engine/scorer'
import { WeightPanel } from '../components/WeightPanel'
import { TeamRankingTable } from '../components/TeamRankingTable'

export function HomePage() {
  const { teams, loading, source } = useTeamData()
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS)

  const scores = useMemo(
    () => sortScores(computeScores(teams, weights)),
    [teams, weights],
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          🇨🇦🇲🇽🇺🇸 2026 世界杯球队综合评分
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          基于 7 维加权模型实时预测 · 数据来源: {source === 'api:football-data' ? 'football-data.org' : '静态种子数据'}
          {loading && ' (加载中...)'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar — weight panel */}
        <div className="lg:col-span-1">
          <WeightPanel weights={weights} onChange={setWeights} />
        </div>

        {/* Main — ranking table */}
        <div className="lg:col-span-3">
          <TeamRankingTable scores={scores} />
        </div>
      </div>
    </div>
  )
}
