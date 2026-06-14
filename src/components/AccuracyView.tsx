/**
 * AccuracyView — displays prediction accuracy statistics
 *
 * Two sections:
 *   1. 胜负平准确率 (Win/Draw/Loss outcome accuracy)
 *   2. 比分准确率 (Exact score accuracy)
 */
import { useMemo, useState } from 'react'
import { computeAccuracy, type AccuracyStats } from '../utils/accuracy'

export function AccuracyView() {
  const stats = useMemo(() => computeAccuracy(), [])

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <SummaryCards stats={stats} />

      {/* Detail sections */}
      <OutcomeAccuracySection stats={stats} />
      <ScoreAccuracySection stats={stats} />
    </div>
  )
}

// ── Summary Cards ──────────────────────────────────────────

function SummaryCards({ stats }: { stats: AccuracyStats }) {
  const outcomePct = stats.totalMatches > 0
    ? ((stats.correctOutcomes / stats.totalMatches) * 100).toFixed(1)
    : '0.0'
  const scorePct = stats.totalMatches > 0
    ? ((stats.correctScores / stats.totalMatches) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Total */}
      <div className="bg-slate-800/70 border border-slate-700 rounded-xl px-5 py-4">
        <div className="text-slate-400 text-xs font-medium uppercase tracking-wide">已完赛场次</div>
        <div className="text-3xl font-bold text-white mt-1">{stats.totalMatches}</div>
      </div>

      {/* Outcome accuracy */}
      <div className="bg-slate-800/70 border border-slate-700 rounded-xl px-5 py-4">
        <div className="text-slate-400 text-xs font-medium uppercase tracking-wide">胜负平准确率</div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl font-bold text-blue-400">{outcomePct}%</span>
          <span className="text-sm text-slate-500">
            ({stats.correctOutcomes}/{stats.totalMatches})
          </span>
        </div>
      </div>

      {/* Score accuracy */}
      <div className="bg-slate-800/70 border border-slate-700 rounded-xl px-5 py-4">
        <div className="text-slate-400 text-xs font-medium uppercase tracking-wide">比分准确率</div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl font-bold text-green-400">{scorePct}%</span>
          <span className="text-sm text-slate-500">
            ({stats.correctScores}/{stats.totalMatches})
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Outcome Accuracy Section ────────────────────────────────

function OutcomeAccuracySection({ stats }: { stats: AccuracyStats }) {
  const [sortBy, setSortBy] = useState<'match' | 'result'>('match')

  const items = useMemo(() => {
    const list = stats.matchDetails.map(d => ({
      ...d,
      outcomeLabel: outcomeLabel(d.actualOutcome, d.predictedOutcome),
    }))
    if (sortBy === 'result') {
      list.sort((a, b) => Number(a.outcomeCorrect) - Number(b.outcomeCorrect))
    }
    return list
  }, [stats, sortBy])

  if (stats.totalMatches === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
        <p className="text-slate-400">暂无已完赛的比赛数据，请在「赛程」页面输入比分后查看预测准确性。</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🏷️ 胜负平预测</span>
          <span className="text-sm font-normal text-slate-400">
            正确 {stats.correctOutcomes}/{stats.totalMatches}
          </span>
        </h2>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'match' | 'result')}
          className="bg-slate-700 text-white text-xs rounded-lg px-2 py-1.5 border border-slate-600"
        >
          <option value="match">按比赛顺序</option>
          <option value="result">按预测结果</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-xs uppercase border-b border-slate-700/50">
              <th className="text-left px-4 py-3 font-medium">比赛</th>
              <th className="text-center px-3 py-3 font-medium">实际比分</th>
              <th className="text-center px-3 py-3 font-medium">预测比分</th>
              <th className="text-center px-3 py-3 font-medium">实际结果</th>
              <th className="text-center px-3 py-3 font-medium">预测结果</th>
              <th className="text-center px-3 py-3 font-medium">判定</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {items.map(d => (
              <tr key={d.matchId} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 text-white whitespace-nowrap">
                  {d.homeName} vs {d.awayName}
                </td>
                <td className="px-3 py-3 text-center font-mono font-bold text-green-400">
                  {d.actualScore}
                </td>
                <td className="px-3 py-3 text-center font-mono text-orange-400">
                  {d.predictedScore}
                </td>
                <td className="px-3 py-3 text-center">
                  <OutcomeBadge outcome={d.actualOutcome} />
                </td>
                <td className="px-3 py-3 text-center">
                  <OutcomeBadge outcome={d.predictedOutcome} />
                </td>
                <td className="px-3 py-3 text-center">
                  {d.outcomeCorrect
                    ? <span className="text-green-400 text-lg" title="胜负平正确">✅</span>
                    : <span className="text-red-400 text-lg" title="胜负平错误">❌</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Score Accuracy Section ──────────────────────────────────

function ScoreAccuracySection({ stats }: { stats: AccuracyStats }) {
  const correctMatches = useMemo(
    () => stats.matchDetails.filter(d => d.scoreCorrect),
    [stats]
  )

  if (stats.totalMatches === 0) return null

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🎯 比分预测</span>
          <span className="text-sm font-normal text-slate-400">
            正确 {stats.correctScores}/{stats.totalMatches}
          </span>
        </h2>
      </div>

      {/* Correct score highlights */}
      <div className="px-5 py-4">
        {correctMatches.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {correctMatches.map(d => (
              <div
                key={d.matchId}
                className="bg-green-900/30 border border-green-700/50 rounded-lg px-3 py-2 flex items-center gap-2"
                title={`${d.homeName} ${d.actualScore} ${d.awayName}`}
              >
                <span className="text-green-400 text-sm">✅</span>
                <span className="text-white text-sm font-medium">{d.homeName}</span>
                <span className="text-green-400 font-mono font-bold">{d.actualScore}</span>
                <span className="text-white text-sm font-medium">{d.awayName}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">暂未命中任何精确比分</p>
        )}
      </div>

      {/* Full score table */}
      <div className="overflow-x-auto border-t border-slate-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-xs uppercase border-b border-slate-700/50">
              <th className="text-left px-4 py-3 font-medium">比赛</th>
              <th className="text-center px-3 py-3 font-medium">实际比分</th>
              <th className="text-center px-3 py-3 font-medium">预测比分</th>
              <th className="text-center px-3 py-3 font-medium">偏差</th>
              <th className="text-center px-3 py-3 font-medium">判定</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {stats.matchDetails.map(d => {
              const [aH, aA] = d.actualScore.split('-').map(Number)
              const [pH, pA] = d.predictedScore.split('-').map(Number)
              const diffH = pH - aH
              const diffA = pA - aA
              const diffStr = diffH === 0 && diffA === 0 ? '0' : `${diffH > 0 ? '+' : ''}${diffH}, ${diffA > 0 ? '+' : ''}${diffA}`
              return (
                <tr key={d.matchId} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-white whitespace-nowrap">
                    {d.homeName} vs {d.awayName}
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-green-400">
                    {d.actualScore}
                  </td>
                  <td className="px-3 py-3 text-center font-mono text-orange-400">
                    {d.predictedScore}
                  </td>
                  <td className="px-3 py-3 text-center font-mono text-slate-400 text-xs">
                    {diffStr}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {d.scoreCorrect
                      ? <span className="text-green-400 text-lg" title="比分准确">✅</span>
                      : <span className="text-red-400 text-lg" title="比分错误">❌</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Shared helpers ──────────────────────────────────────────

function OutcomeBadge({ outcome }: { outcome: 'home' | 'draw' | 'away' }) {
  const config: Record<string, { label: string; cls: string }> = {
    home: { label: '主胜', cls: 'bg-green-900/40 text-green-400 border-green-700/50' },
    draw: { label: '平局', cls: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50' },
    away: { label: '客胜', cls: 'bg-blue-900/40 text-blue-400 border-blue-700/50' },
  }
  const c = config[outcome]
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${c.cls}`}>
      {c.label}
    </span>
  )
}

function outcomeLabel(actual: 'home' | 'draw' | 'away', predicted: 'home' | 'draw' | 'away'): string {
  if (actual === predicted) return '正确'
  return `应${outcomeLabelShort(actual)}→预${outcomeLabelShort(predicted)}`
}

function outcomeLabelShort(o: 'home' | 'draw' | 'away'): string {
  if (o === 'home') return '主胜'
  if (o === 'away') return '客胜'
  return '平'
}
