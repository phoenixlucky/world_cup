/**
 * AccuracyPage — prediction accuracy page
 *
 * Shows how well the prediction model is performing:
 *   - Win/Draw/Loss outcome accuracy
 *   - Exact score accuracy
 */
import { AccuracyView } from '../components/AccuracyView'

export function AccuracyPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">📊 预测准确性</h1>
        <p className="text-slate-400 text-sm mt-1">
          基于已有比赛比分，对比预测模型与实际结果的差异
        </p>
      </div>
      <AccuracyView />
    </div>
  )
}
