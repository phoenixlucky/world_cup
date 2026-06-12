/**
 * TeamRankingTable — sortable ranking table with dimension breakdown
 */
import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { TeamScores } from '../engine/scorer'
import { FlagImg } from './FlagImg'

const groupColors: Record<string, { bg: string; text: string }> = {
  A: { bg: '#1e3a5f', text: '#93c5fd' },
  B: { bg: '#3b1f4e', text: '#c4b5fd' },
  C: { bg: '#1e3a2f', text: '#86efac' },
  D: { bg: '#4a1a1a', text: '#fca5a5' },
  E: { bg: '#3a3a1a', text: '#fde68a' },
  F: { bg: '#1a2e3a', text: '#67e8f9' },
  G: { bg: '#2a1a3a', text: '#d8b4fe' },
  H: { bg: '#1a2a1a', text: '#a7f3d0' },
  I: { bg: '#3a1a2a', text: '#f9a8d4' },
  J: { bg: '#2a2a4a', text: '#a5b4fc' },
  K: { bg: '#3a2a1a', text: '#fdba74' },
  L: { bg: '#1a3a3a', text: '#5eead4' },
}

interface Props {
  scores: TeamScores[]
  topN?: number
  showChart?: boolean
}

export function TeamRankingTable({ scores, topN, showChart = true }: Props) {
  const sorted = useMemo(
    () => [...scores].sort((a, b) => b.total - a.total),
    [scores],
  )

  const display = topN ? sorted.slice(0, topN) : sorted

  // Top 10 chart data
  const chartData = useMemo(() => {
    const top10 = [...scores].sort((a, b) => b.total - a.total).slice(0, 10)
    return top10.map(s => ({
      name: s.teamNameCN,
      score: Math.round(s.total),
    }))
  }, [scores])

  return (
    <div className="space-y-6">
      {/* Bar chart */}
      {showChart && chartData.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">📊 前十名综合评分</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 20 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#f1f5f9' }}
                formatter={(value) => [`${value}`, '综合评分']}
                labelFormatter={(label) => label}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={`hsl(${210 + i * 12}, 70%, 55%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-slate-400 text-left">
              <th className="px-3 py-3 font-medium">#</th>
              <th className="px-3 py-3 font-medium">球队</th>
              <th className="px-3 py-3 font-medium">组别</th>
              <th className="px-3 py-3 font-medium text-right">进攻火力</th>
              <th className="px-3 py-3 font-medium text-right hidden sm:table-cell">防守稳固度</th>
              <th className="px-3 py-3 font-medium text-right">综合评分</th>
              <th className="px-3 py-3 font-medium text-right">FIFA排名</th>
              <th className="px-3 py-3 font-medium text-right">身价(€M)</th>
              <th className="px-3 py-3 font-medium text-right hidden sm:table-cell">近20场进球</th>
              <th className="px-3 py-3 font-medium text-right hidden md:table-cell">胜率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {display.map((s, i) => (
              <tr
                key={s.teamId}
                className="hover:bg-slate-700/40 transition-colors"
              >
                <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">
                  {i + 1}
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xl mr-2"><FlagImg code={s.flagCode} size={20} /></span>
                  <span className="text-white font-medium">{s.teamNameCN}</span>
                  <span className="text-slate-500 ml-1.5 text-xs hidden sm:inline">
                    {s.teamName}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="px-2 py-0.5 rounded text-xs font-mono"
                    style={{
                      backgroundColor: groupColors[s.group]?.bg || '#334155',
                      color: groupColors[s.group]?.text || '#cbd5e1',
                    }}>
                    {s.group}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`font-bold font-mono ${
                    s.raw.goals / 20 >= 1.8 ? 'text-green-400' :
                    s.raw.goals / 20 >= 1.2 ? 'text-blue-400' :
                    'text-yellow-400'
                  }`}>
                    {(s.raw.goals / 20).toFixed(1)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                  <span className={`font-bold font-mono ${
                    (5 - s.raw.goalsAgainst / 20) >= 3.5 ? 'text-green-400' :
                    (5 - s.raw.goalsAgainst / 20) >= 2.5 ? 'text-blue-400' :
                    'text-yellow-400'
                  }`}>
                    {(5 - s.raw.goalsAgainst / 20).toFixed(1)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`font-bold font-mono ${
                    s.total >= 70 ? 'text-green-400' :
                    s.total >= 55 ? 'text-blue-400' :
                    s.total >= 40 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {s.total.toFixed(1)}
                  </span>
                  {/* Mini bar */}
                  <div className="w-16 h-1.5 bg-slate-700 rounded-full mt-1 ml-auto">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${s.total}%` }}
                    />
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right text-slate-300 font-mono">
                  {s.raw.rank}
                </td>
                <td className="px-3 py-2.5 text-right text-slate-300 font-mono">
                  {s.raw.marketVal}
                </td>
                <td className="px-3 py-2.5 text-right text-slate-300 font-mono hidden sm:table-cell">
                  {s.raw.goals}
                </td>
                <td className="px-3 py-2.5 text-right text-slate-300 font-mono hidden md:table-cell">
                  {s.raw.wins}/20
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
