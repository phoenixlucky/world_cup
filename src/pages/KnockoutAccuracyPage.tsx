/**
 * KnockoutAccuracyPage — 淘汰赛预测准确性
 */
import { KnockoutAccuracyView } from '../components/KnockoutAccuracyView'

export function KnockoutAccuracyPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">⚔️ 淘汰赛预测准确性</h1>
        <p className="text-slate-400 text-sm mt-1">
          尉缭子分析法 · 32 强淘汰赛实际比分 vs 预测对比
        </p>
      </div>
      <KnockoutAccuracyView />
    </div>
  )
}
