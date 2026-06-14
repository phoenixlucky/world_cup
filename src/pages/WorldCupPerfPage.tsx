/**
 * WorldCupPerfPage — 世界杯表现得分页面
 *
 * 显示所有球队的本次世界杯表现评分（与首页「世界杯表现」列一致），
 * 按评分从高到低排列。
 */
import { WorldCupPerfView } from '../components/WorldCupPerfView'

export function WorldCupPerfPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">🏅 世界杯表现</h1>
        <p className="text-slate-400 text-sm mt-1">
          基于历史战绩与预期评定的各队本次世界杯综合表现得分（0-100），
          与首页「世界杯表现」列数据一致
        </p>
      </div>
      <WorldCupPerfView />
    </div>
  )
}
