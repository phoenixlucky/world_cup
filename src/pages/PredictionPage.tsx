/**
 * PredictionPage — Monte Carlo champion prediction
 */
import { useState, useMemo, useCallback } from 'react'
import { useTeamData } from '../hooks/useTeamData'
import { useSimulation } from '../hooks/useSimulation'
import { computeScores, DEFAULT_WEIGHTS, type Weights } from '../engine/scorer'
import { WeightPanel } from '../components/WeightPanel'
import { ChampionPrediction } from '../components/ChampionPrediction'

export function PredictionPage() {
  const { teams } = useTeamData()
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS)
  const sim = useSimulation()

  const scores = useMemo(
    () => computeScores(teams, weights),
    [teams, weights],
  )

  const handleStart = useCallback(() => {
    sim.start(scores, 10000)
  }, [sim, scores])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">🔮 冠军预测</h1>
        <p className="text-slate-400 text-sm mt-1">
          蒙特卡洛模拟 · 完整运行 10,000 次世界杯赛程 · 统计夺冠概率分布
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <WeightPanel weights={weights} onChange={setWeights} />
        </div>
        <div className="lg:col-span-3">
          <ChampionPrediction
            result={sim.result}
            scores={scores}
            running={sim.running}
            progress={sim.progress}
            onStart={handleStart}
          />
        </div>
      </div>
    </div>
  )
}
