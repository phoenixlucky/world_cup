/**
 * SchedulePage — match schedule
 */
import { ScheduleView } from '../components/ScheduleView'

export function SchedulePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">📅 赛程查询</h1>
        <p className="text-slate-400 text-sm mt-1">
          2026 世界杯完整赛程 · 6月11日–7月19日 · 按日期/轮次/场地筛选
          <a
            href="https://zh.wikipedia.org/wiki/2026%E5%B9%B4%E5%9C%8B%E9%9A%9B%E8%B6%B3%E5%8D%94%E4%B8%96%E7%95%8C%E7%9B%83"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-blue-400 hover:text-blue-300 underline"
          >
            维基百科源 →
          </a>
        </p>
      </div>
      <ScheduleView />
    </div>
  )
}
