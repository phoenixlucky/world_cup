/**
 * WorldCupPerfView — displays actual tournament performance for all teams
 *
 * Computes a 0-100 performance score from actual match results (read from
 * localStorage wc26-scores). Teams without results show their pre-tournament
 * worldCupPerf at half-weight (muted). Color-coding matches TeamRankingTable
 * (≥80 red, ≥60 orange, ≥40 yellow, <40 slate).
 */
import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { computeTournamentPerf } from '../utils/tournamentPerf'
import { FlagImg } from './FlagImg'

export function WorldCupPerfView() {
  const perfs = useMemo(() => computeTournamentPerf(), [])

  // Group-aggregated stats
  const groupStats = useMemo(() => {
    const groups = new Map<string, { avg: number; count: number; withResult: number }>()
    for (const p of perfs) {
      if (!groups.has(p.group)) groups.set(p.group, { avg: 0, count: 0, withResult: 0 })
      const g = groups.get(p.group)!
      g.avg += p.perf
      g.count++
      if (p.hasResults) g.withResult++
    }
    for (const [, g] of groups) {
      g.avg = Math.round(g.avg / g.count)
    }
    return groups
  }, [perfs])

  // Top 10 chart data (only teams with results)
  const chartData = useMemo(() => {
    const withResults = perfs.filter(p => p.hasResults).slice(0, 10)
    if (withResults.length === 0) {
      // Fallback to top 10 overall if no results yet
      return perfs.slice(0, 10).map(p => ({ name: p.teamNameCN, perf: p.preTournamentPerf, hasResult: false }))
    }
    return withResults.map(p => ({ name: p.teamNameCN, perf: p.perf, hasResult: true }))
  }, [perfs])

  const hasAnyResults = perfs.some(p => p.hasResults)

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-3 text-sm">
        {(() => {
          const top = perfs[0]
          const bot = perfs[perfs.length - 1]
          const avg = Math.round(perfs.reduce((s, p) => s + p.perf, 0) / perfs.length)
          return (
            <>
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2">
                <span className="text-slate-400">最高 </span>
                <span className="text-white font-bold">{top?.teamNameCN} {top?.perf}</span>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2">
                <span className="text-slate-400">最低 </span>
                <span className="text-white font-bold">{bot?.teamNameCN} {bot?.perf}</span>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2">
                <span className="text-slate-400">平均 </span>
                <span className="text-white font-bold">{avg}</span>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2">
                <span className="text-slate-400">已完赛 </span>
                <span className="text-white font-bold">{perfs.filter(p => p.hasResults).length} 队</span>
              </div>
            </>
          )
        })()}
      </div>

      {/* Bar chart — top 10 (by actual performance if available) */}
      {chartData.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            {hasAnyResults ? '📊 前十名实际表现' : '📊 前十名赛前预期'}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 20 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#f1f5f9' }}
                formatter={(value) => [`${value}`, '表现得分']}
                labelFormatter={(label) => label}
              />
              <Bar dataKey="perf" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.hasResult !== false ? perfColor(d.perf) : '#475569'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Group averages row */}
      <details className="bg-slate-800/40 border border-slate-700 rounded-xl">
        <summary className="px-5 py-3 text-sm font-semibold text-slate-300 cursor-pointer hover:text-white transition-colors">
          📋 小组平均表现
        </summary>
        <div className="px-5 pb-4 flex flex-wrap gap-2">
          {Array.from(groupStats.entries())
            .sort(([, a], [, b]) => b.avg - a.avg)
            .map(([g, st]) => (
              <div key={g} className="bg-slate-700/40 border border-slate-600/50 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-300">{g}组</span>
                <span className="text-sm font-bold font-mono" style={{ color: perfColor(st.avg) }}>{st.avg}</span>
                {st.withResult > 0 && (
                  <span className="text-[10px] text-slate-500 ml-1">{st.withResult}队已赛</span>
                )}
              </div>
            ))}
        </div>
      </details>

      {/* Full ranking table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-slate-400 text-left">
              <th className="px-3 py-3 font-medium">#</th>
              <th className="px-3 py-3 font-medium">球队</th>
              <th className="px-3 py-3 font-medium">组别</th>
              <th className="px-3 py-3 font-medium text-right">实际表现</th>
              <th className="px-3 py-3 font-medium text-right hidden sm:table-cell">赛果</th>
              <th className="px-3 py-3 font-medium text-right hidden sm:table-cell">净胜球</th>
              <th className="px-3 py-3 font-medium text-right hidden md:table-cell">预期值</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {perfs.map((p, i) => {
              const barColor = p.hasResults ? perfColor(p.perf) : '#475569'
              return (
                <tr key={p.teamId} className={`hover:bg-slate-700/40 transition-colors ${!p.hasResults ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-xl mr-2"><FlagImg code={p.flagCode} size={20} /></span>
                    <span className="text-white font-medium">{p.teamNameCN}</span>
                    <span className="text-slate-500 ml-1.5 text-xs hidden sm:inline">{p.teamName}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-mono"
                      style={{
                        backgroundColor: groupBg(p.group),
                        color: groupText(p.group),
                      }}
                    >
                      {p.group}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {!p.hasResults && <span className="text-[10px] text-slate-600 font-medium">待赛</span>}
                      <span className={`font-bold font-mono text-lg ${p.hasResults ? perfTextClass(p.perf) : 'text-slate-600'}`}>
                        {p.perf}
                      </span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="w-16 sm:w-24 h-1.5 bg-slate-700 rounded-full mt-1 ml-auto">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.max(p.perf, 2)}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                    {p.hasResults ? (
                      <span className="font-mono text-xs text-white">
                        {resultString(p)}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                    {p.hasResults ? (
                      <span className={`font-mono text-xs font-bold ${
                        p.goalsFor - p.goalsAgainst > 0 ? 'text-green-400' :
                        p.goalsFor - p.goalsAgainst < 0 ? 'text-red-400' :
                        'text-slate-400'
                      }`}>
                        {p.goalsFor - p.goalsAgainst > 0 ? '+' : ''}{p.goalsFor - p.goalsAgainst}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right hidden md:table-cell">
                    <span className="font-mono text-xs text-slate-500">
                      {p.preTournamentPerf}
                    </span>
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

// ── Helpers ────────────────────────────────────────────────

function resultString(p: { matchesWon: number; matchesDrawn: number; matchesLost: number; matchesPlayed: number }): string {
  if (p.matchesPlayed === 0) return '-'
  return `${'W'.repeat(p.matchesWon)}${'D'.repeat(p.matchesDrawn)}${'L'.repeat(p.matchesLost)}` || '-'
}

function perfColor(score: number): string {
  if (score >= 80) return '#f87171'
  if (score >= 60) return '#fb923c'
  if (score >= 40) return '#facc15'
  return '#94a3b8'
}

function perfTextClass(score: number): string {
  if (score >= 80) return 'text-red-400'
  if (score >= 60) return 'text-orange-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-slate-400'
}

function groupBg(group: string): string {
  const colors: Record<string, string> = {
    A: '#1e3a5f', B: '#3b1f4e', C: '#1e3a2f', D: '#4a1a1a',
    E: '#3a3a1a', F: '#1a2e3a', G: '#2a1a3a', H: '#1a2a1a',
    I: '#3a1a2a', J: '#2a2a4a', K: '#3a2a1a', L: '#1a3a3a',
  }
  return colors[group] || '#334155'
}

function groupText(group: string): string {
  const colors: Record<string, string> = {
    A: '#93c5fd', B: '#c4b5fd', C: '#86efac', D: '#fca5a5',
    E: '#fde68a', F: '#67e8f9', G: '#d8b4fe', H: '#a7f3d0',
    I: '#f9a8d4', J: '#a5b4fc', K: '#fdba74', L: '#5eead4',
  }
  return colors[group] || '#cbd5e1'
}
