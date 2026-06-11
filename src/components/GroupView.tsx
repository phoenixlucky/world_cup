/**
 * GroupView — displays all 12 groups with team ratings and predicted qualifiers
 */
import { useMemo } from 'react'
import type { TeamScores } from '../engine/scorer'
import { FlagImg } from './FlagImg'

// ── Group label colors (matching ScheduleView) ─────────────
const groupColors: Record<string, string> = {
  A: '#1e3a5f', B: '#3b1f4e', C: '#1e3a2f', D: '#4a1a1a',
  E: '#3a3a1a', F: '#1a2e3a', G: '#2a1a3a', H: '#1a2a1a',
  I: '#3a1a2a', J: '#2a2a4a', K: '#3a2a1a', L: '#1a3a3a',
}
import { groupNames } from '../data/teams'

interface Props {
  scores: TeamScores[]
}

export function GroupView({ scores }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, TeamScores[]>()
    for (const g of groupNames) {
      map.set(g, scores.filter(s => s.group === g).sort((a, b) => b.total - a.total))
    }
    return map
  }, [scores])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {groupNames.map(g => {
        const teams = groups.get(g) || []
        const top2 = teams.slice(0, 2)
        const third = teams.length > 2 ? teams[2] : null

        return (
          <div key={g} className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-700"
              style={{ backgroundColor: groupColors[g] || '#1e293b' }}>
              <h3 className="text-lg font-bold text-white">
                {g} 组
              </h3>
            </div>

            {/* Teams */}
            <div className="divide-y divide-slate-700/50">
              {teams.map((t, i) => {
                const qualified = i < 2
                const thirdBest = i === 2

                return (
                  <div
                    key={t.teamId}
                    className={`px-4 py-3 flex items-center justify-between transition-colors ${
                      qualified ? 'bg-green-900/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank badge */}
                      <span className={`text-xs font-mono font-bold w-5 text-center ${
                        i === 0 ? 'text-yellow-400' :
                        i === 1 ? 'text-slate-400' :
                        'text-slate-600'
                      }`}>
                        {i + 1}
                      </span>
                      <FlagImg code={t.flagCode} size={22} className="flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-white truncate block">
                          {t.teamNameCN}
                        </span>
                        <span className="text-xs text-slate-500">{t.continent}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className={`text-sm font-mono font-bold ${
                        t.total >= 70 ? 'text-green-400' :
                        t.total >= 55 ? 'text-blue-400' :
                        t.total >= 40 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {t.total.toFixed(0)}
                      </span>
                      {qualified && (
                        <span className="text-green-400 text-xs bg-green-400/10 px-1.5 py-0.5 rounded">
                          晋级
                        </span>
                      )}
                      {thirdBest && (
                        <span className="text-yellow-400 text-xs bg-yellow-400/10 px-1.5 py-0.5 rounded">
                          待定
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Group summary */}
            <div className="px-4 py-2 bg-slate-900/50 text-xs text-slate-500 border-t border-slate-700/50">
              预测出线: {top2.map(t => t.teamNameCN).join(', ')}
              {third && ` | 第3名: ${third.teamNameCN}`}
            </div>
          </div>
        )
      })}
    </div>
  )
}
