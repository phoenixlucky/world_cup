/**
 * ChampionPrediction — Monte Carlo simulation results visualisation
 */
import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
} from 'recharts'
import type { TeamScores } from '../engine/scorer'
import type { SimulationResult } from '../engine/simulator'
import { toPercentages } from '../engine/simulator'
import { FlagImg } from './FlagImg'

interface Props {
  result: SimulationResult | null
  scores: TeamScores[]
  running: boolean
  progress: number
  onStart: () => void
}

const COLORS = [
  '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#f97316',
  '#14b8a6', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#d946ef',
  '#0ea5e9', '#10b981', '#f59e0b', '#6366f1',
]

export function ChampionPrediction({ result, scores, running, progress, onStart }: Props) {
  // Top 15 by champion probability
  const chartData = useMemo(() => {
    if (!result) return []
    const pcts = toPercentages(result.championCounts, result.totalSims)

    // Get team info
    const smap = new Map(scores.map(s => [s.teamId, s]))

    return Object.entries(pcts)
      .map(([id, pct]) => ({ id, pct, team: smap.get(id) }))
      .filter(d => d.team)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 15)
  }, [result, scores])

  // Top 10 for pie chart
  const pieData = useMemo(() => {
    if (!result) return []
    const pcts = toPercentages(result.championCounts, result.totalSims)
    const smap = new Map(scores.map(s => [s.teamId, s]))

    const items = Object.entries(pcts)
      .map(([id, pct]) => ({ id, pct, team: smap.get(id) }))
      .filter(d => d.team && d.pct > 0.5)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 10)

    const others = Object.entries(pcts)
      .filter(([id]) => !items.find(i => i.id === id))
      .reduce((sum, [, pct]) => sum + pct, 0)

    return [
      ...items.map(d => ({
        name: `${d.team!.teamNameCN}`,
        value: d.pct,
      })),
      ...(others > 0 ? [{ name: '其他', value: Math.round(others * 100) / 100 }] : []),
    ]
  }, [result, scores])

  if (!result) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-8 text-center">
        <p className="text-slate-400 mb-4">运行蒙特卡洛模拟以查看夺冠概率</p>
        <button
          onClick={onStart}
          disabled={running}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                     text-white font-semibold rounded-xl transition-colors"
        >
          {running ? `模拟中 ${progress}%` : '🚀 开始模拟 (10,000 次)'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Control bar */}
      <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <div>
          <span className="text-sm text-slate-400">
            已完成 <span className="text-white font-bold">{result.totalSims.toLocaleString()}</span> 次模拟
          </span>
        </div>
        <button
          onClick={onStart}
          disabled={running}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                     text-white text-sm font-medium rounded-lg transition-colors"
        >
          {running ? `模拟中 ${progress}%` : '🔄 重新模拟'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">🏆 夺冠概率分布</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
                dataKey="value"
                label={(d: any) => `${d.name} ${Math.round(d.value * 10) / 10}%`}
                labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                style={{ fontSize: 10 }}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                formatter={(value, name) => [`${value}%`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top 15 bar chart */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">📊 夺冠概率 Top 15</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} unit="%" />
              <YAxis
                type="category"
                dataKey="team.teamNameCN"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                width={130}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                formatter={(value) => [`${value}%`, '夺冠概率']}
                labelFormatter={(label) => {
                  const d = chartData.find(d => d.team?.teamNameCN === label)
                  return `${label} ${d?.team?.teamNameCN || ''}`
                }}
              />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 20 table */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
        <h3 className="text-sm font-semibold text-slate-300 px-4 py-3 border-b border-slate-700">
          🏅 夺冠概率完整排行
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-slate-400 text-left">
                <th className="px-3 py-2.5 font-medium">#</th>
                <th className="px-3 py-2.5 font-medium">球队</th>
                <th className="px-3 py-2.5 font-medium text-right">夺冠概率</th>
                <th className="px-3 py-2.5 font-medium text-right hidden sm:table-cell">四强概率</th>
                <th className="px-3 py-2.5 font-medium text-right hidden md:table-cell">出线概率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {chartData.map((d, i) => {
                const semiPct = result.semiFinalCounts[d.id]
                  ? (result.semiFinalCounts[d.id] / result.totalSims * 100).toFixed(1)
                  : '0.0'
                const koPct = result.knockoutCounts[d.id]
                  ? (result.knockoutCounts[d.id] / result.totalSims * 100).toFixed(1)
                  : '0.0'

                return (
                  <tr key={d.id} className="hover:bg-slate-700/40 transition-colors">
                    <td className="px-3 py-2 text-slate-500 font-mono text-xs">{i + 1}</td>
                    <td className="px-3 py-2">
                      <FlagImg code={d.team!.flagCode} size={20} className="mr-2" />
                      <span className="text-white font-medium">{d.team!.teamNameCN}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-bold font-mono text-yellow-400">{d.pct}%</span>
                    </td>
                    <td className="px-3 py-2 text-right text-blue-400 font-mono hidden sm:table-cell">
                      {semiPct}%
                    </td>
                    <td className="px-3 py-2 text-right text-green-400 font-mono hidden md:table-cell">
                      {koPct}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
