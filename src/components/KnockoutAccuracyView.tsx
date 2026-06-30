/**
 * KnockoutAccuracyView — 淘汰赛（尉缭子分析法）预测准确性
 *
 * 展示 32 强淘汰赛的实际比分 vs 尉缭子分析法预测对比
 * 并统计胜负方向准确率
 */
import { useMemo } from 'react'
import { teams } from '../data/teams'
import { LIVE_SCORES, KNOCKOUT_PREDICTIONS, KNOCKOUT_WINNERS } from '../data/results'

// 32 强对阵表（与 scripts/fetch-results.mjs 保持一致）
const R32_MATCHUPS: [string, string][] = [
  ['south-africa', 'canada'],          // r32-0
  ['germany', 'paraguay'],             // r32-1
  ['netherlands', 'morocco'],          // r32-2
  ['brazil', 'japan'],                 // r32-3
  ['france', 'sweden'],                // r32-4
  ['ivory-coast', 'norway'],           // r32-5
  ['mexico', 'ecuador'],               // r32-6
  ['england', 'dr-congo'],             // r32-7
  ['usa', 'bosnia'],                   // r32-8
  ['belgium', 'senegal'],              // r32-9
  ['portugal', 'croatia'],             // r32-10
  ['spain', 'austria'],                // r32-11
  ['switzerland', 'algeria'],          // r32-12
  ['argentina', 'cape-verde'],         // r32-13
  ['colombia', 'ghana'],               // r32-14
  ['australia', 'egypt'],              // r32-15
]

/** 返回队伍的中文名 */
function teamName(id: string): string {
  return teams.find(t => t.id === id)?.nameCN || teams.find(t => t.id === id)?.name || id
}

/** 从比分字符串解析胜负方 */
function getOutcome(homeScore: number, awayScore: number): 'home' | 'draw' | 'away' {
  if (homeScore > awayScore) return 'home'
  if (awayScore > homeScore) return 'away'
  return 'draw'
}

interface KOAccuracyRow {
  id: string           // r32-N
  homeName: string
  awayName: string
  actualScore: string  // 如 "1-1"
  predScore: string    // 如 "1-0"
  outcomeCorrect: boolean
  scoreCorrect: boolean
  status: 'completed' | 'upcoming'
}

export function KnockoutAccuracyView() {
  const rows = useMemo(() => {
    const result: KOAccuracyRow[] = []
    for (let i = 0; i < R32_MATCHUPS.length; i++) {
      const mid = `r32-${i}`
      const [homeId, awayId] = R32_MATCHUPS[i]
      const homeName = teamName(homeId)
      const awayName = teamName(awayId)
      const actualScore = LIVE_SCORES[mid]
      const predScore = KNOCKOUT_PREDICTIONS[mid] || ''

      if (!actualScore) {
        // 尚未开赛
        result.push({ id: mid, homeName, awayName, actualScore: '', predScore, outcomeCorrect: false, scoreCorrect: false, status: 'upcoming' })
        continue
      }

      const [aH, aA] = actualScore.split('-').map(Number)
      const [pH, pA] = predScore.split('-').map(Number)

      const actualOutcome = getOutcome(aH, aA)
      const predOutcome = getOutcome(pH, pA)

      // 对于 knockout，draw 比较特殊——尉缭子分析法预测的 draw 意味着点球
      // 实际draw意味着点球决胜，此时胜负方向看 KNOCKOUT_WINNERS
      let outcomeCorrect = actualOutcome === predOutcome
      // 如果预测draw，实际draw，但方向不同，进一步判断
      if (!outcomeCorrect && actualOutcome === 'draw' && predOutcome === 'draw') {
        outcomeCorrect = true  // 都预测了加时/点球
      }
      // 如果预测了draw但实际是某队赢（或者反过来），检查 winner 预测
      if (!outcomeCorrect) {
        const kw = KNOCKOUT_WINNERS[mid]
        if (kw) {
          const predWinner = kw.winner  // 'home' or 'away'
          outcomeCorrect = (actualOutcome === 'home' && predWinner === 'home') ||
                           (actualOutcome === 'away' && predWinner === 'away')
        }
      }

      const scoreCorrect = aH === pH && aA === pA

      result.push({ id: mid, homeName, awayName, actualScore, predScore, outcomeCorrect, scoreCorrect, status: 'completed' })
    }
    return result
  }, [])

  const completed = rows.filter(r => r.status === 'completed')
  const total = completed.length
  const correctOutcomes = completed.filter(r => r.outcomeCorrect).length
  const correctScores = completed.filter(r => r.scoreCorrect).length
  const outcomePct = total > 0 ? ((correctOutcomes / total) * 100).toFixed(1) : '0.0'
  const scorePct = total > 0 ? ((correctScores / total) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800/70 border border-slate-700 rounded-xl px-5 py-4">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wide">已赛32强</div>
          <div className="text-3xl font-bold text-white mt-1">{total}/16</div>
        </div>
        <div className="bg-slate-800/70 border border-slate-700 rounded-xl px-5 py-4">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wide">晋级方向准确率</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-blue-400">{outcomePct}%</span>
            <span className="text-sm text-slate-500">({correctOutcomes}/{total})</span>
          </div>
        </div>
        <div className="bg-slate-800/70 border border-slate-700 rounded-xl px-5 py-4">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wide">比分准确率</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-purple-400">{scorePct}%</span>
            <span className="text-sm text-slate-500">({correctScores}/{total})</span>
          </div>
        </div>
        <div className="bg-slate-800/70 border border-slate-700 rounded-xl px-5 py-4">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wide">分析方法</div>
          <div className="text-lg font-bold text-yellow-400 mt-1">尉缭子分析法</div>
        </div>
      </div>

      {/* 32强对阵表 */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">32 强对阵详情</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-700/50">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">对阵</th>
                <th className="px-3 py-3 text-center">实际比分</th>
                <th className="px-3 py-3 text-center">尉缭子预测</th>
                <th className="px-3 py-3 text-center">晋级方向</th>
                <th className="px-3 py-3 text-center hidden sm:table-cell">状态</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const isCompleted = r.status === 'completed'
                let badge: { icon: string; label: string; color: string } | null = null
                if (isCompleted && r.predScore) {
                  if (r.scoreCorrect) {
                    badge = { icon: '✅', label: '比分准确', color: 'text-green-400' }
                  } else if (r.outcomeCorrect) {
                    badge = { icon: '⚠️', label: '方向对', color: 'text-yellow-400' }
                  } else {
                    badge = { icon: '❌', label: '方向错', color: 'text-red-400' }
                  }
                }

                return (
                  <tr key={r.id} className={`hover:bg-slate-700/30 transition-colors ${!isCompleted ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{r.id}</td>
                    <td className="px-4 py-3 text-white whitespace-nowrap font-medium">
                      {r.homeName} vs {r.awayName}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {isCompleted
                        ? <span className="font-mono font-bold text-green-400">{r.actualScore}</span>
                        : <span className="text-slate-600">—</span>
                      }
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.predScore
                        ? <span className="font-mono text-orange-400">{r.predScore}</span>
                        : <span className="text-slate-600">—</span>
                      }
                    </td>
                    <td className="px-3 py-3 text-center">
                      {badge && <span className={`${badge.color} text-xs font-semibold`}>{badge.icon} {badge.label}</span>}
                      {!isCompleted && <span className="text-slate-600 text-xs">未开赛</span>}
                    </td>
                    <td className="px-3 py-3 text-center hidden sm:table-cell">
                      {isCompleted
                        ? <span className="text-green-500/70 text-[11px]">已完赛</span>
                        : <span className="text-slate-600 text-[11px]">待开赛</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 算法说明 */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl px-5 py-4">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">关于尉缭子分析法</h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          尉缭子分析法是基于《尉缭子》兵家思想构建的淘汰赛预测模型，综合考虑：
          小组赛表现趋势、历史交锋、洲际对战优劣势、关键球员影响、
          赛程密度与疲劳度、场地适应性等非量化因素，给出晋级方向和比分预测。
          预测在淘汰赛抽签完成后一次性输出，后续算法更新不会改写已冻结的预测。
        </p>
      </div>
    </div>
  )
}
