/**
 * Round32View — 32强赛程 (Round of 32 schedule)
 *
 * Shows all 16 knockout matches of the Round of 32 with resolved team names,
 * dates, venues, and predicted scores.
 *
 * Combines bracket pairing logic (from BracketView) with schedule layout
 * (from ScheduleView).
 */
import { useMemo } from 'react'
import type { TeamScores } from '../engine/scorer'
import type { GroupStanding } from '../engine/standings'
import { predictFullKnockoutResult } from '../engine/poisson'
import { LIVE_SCORES, KNOCKOUT_PREDICTIONS, KNOCKOUT_WINNERS, R32_PENALTY_WINNERS, knockoutModelTag } from '../data/results'

import { FlagImg } from './FlagImg'

interface Props {
  scores: TeamScores[]
  standings: Map<string, GroupStanding[]>
}

// ── Venue info (subset of ScheduleView's venueMap) ───────────
interface VenueInfo { venue: string; city: string; utcOffset: number }

const venueMap: Record<string, VenueInfo> = {
  '阿兹特克体育场':     { venue: '阿兹特克体育场',   city: '墨西哥城',   utcOffset: -6 },
  '阿克伦球场':         { venue: '阿克伦球场',       city: '萨波潘',     utcOffset: -6 },
  '梅赛德斯-宾士体育场': { venue: '梅赛德斯-宾士体育场', city: '亚特兰大', utcOffset: -4 },
  'SoFi体育场':         { venue: 'SoFi体育场',       city: '英格尔伍德', utcOffset: -7 },
  'BMO球场':            { venue: 'BMO球场',          city: '多伦多',     utcOffset: -4 },
  '李维斯体育场':       { venue: '李维斯体育场',     city: '圣克拉拉',   utcOffset: -7 },
  '卑诗体育馆':         { venue: '卑诗体育馆',       city: '温哥华',     utcOffset: -7 },
  'AT&T体育场':         { venue: 'AT&T体育场',       city: '阿灵顿',     utcOffset: -5 },
  'BBVA体育场':         { venue: 'BBVA体育场',       city: '瓜达卢佩',   utcOffset: -6 },
  'NRG体育场':          { venue: 'NRG体育场',        city: '休斯敦',     utcOffset: -5 },
  '箭頭体育场':         { venue: '箭頭体育场',       city: '堪萨斯城',   utcOffset: -5 },
  '流明球场':           { venue: '流明球场',         city: '西雅图',     utcOffset: -7 },
  '大都会人寿体育场':   { venue: '大都会人寿体育场', city: '东拉瑟福德', utcOffset: -4 },
  '吉列体育场':         { venue: '吉列体育场',       city: '福克斯伯勒', utcOffset: -4 },
  '林肯金融球场':       { venue: '林肯金融球场',     city: '费城',       utcOffset: -4 },
  '硬石体育场':         { venue: '硬石体育场',       city: '迈阿密加登斯', utcOffset: -4 },
}

const allVenueKeys = Object.keys(venueMap)

// r32 dates from ScheduleView
const r32Dates = ['6月28日', '6月29日', '6月30日', '7月1日']

export function Round32View({ scores, standings }: Props) {
  // ── Resolve bracket pairings (same logic as BracketView) ───
  const matches = useMemo(() => {
    const groups = new Map<string, TeamScores[]>()
    for (const s of scores) {
      if (!groups.has(s.group)) groups.set(s.group, [])
      groups.get(s.group)!.push(s)
    }

    const groupRanked = new Map<string, TeamScores[]>()
    for (const [g, gTeams] of groups) {
      const groupSt = standings.get(g)
      if (groupSt) {
        const rankMap = new Map(groupSt.map((s, i) => [s.teamId, i]))
        const sorted = [...gTeams].sort(
          (a, b) => (rankMap.get(a.teamId) ?? 99) - (rankMap.get(b.teamId) ?? 99),
        )
        groupRanked.set(g, sorted)
      } else {
        groupRanked.set(g, [...gTeams].sort((a, b) => b.total - a.total))
      }
    }

    const slotMap = new Map<string, TeamScores>()
    for (const [g, ranked] of groupRanked) {
      if (ranked[0]) slotMap.set(`${g}1`, ranked[0])
      if (ranked[1]) slotMap.set(`${g}2`, ranked[1])
    }

    // 第三名分配：按小组配对
    const thirdGroupMap: Record<number, string> = {
      74: 'D', 77: 'F', 79: 'E', 80: 'K',
      81: 'B', 82: 'I', 85: 'J', 87: 'L',
    }
    const assigned = new Map<number, TeamScores>()
    for (const [matchId, g] of Object.entries(thirdGroupMap)) {
      const third = groupRanked.get(g)?.[2]
      if (third) assigned.set(Number(matchId), third)
    }

    const matchDefs: Record<number, [string, string]> = {
      73: ['A2', 'B2'],
      74: ['E1', assigned.get(74)?.teamId ?? ''],
      75: ['F1', 'C2'],
      76: ['C1', 'F2'],
      77: ['I1', assigned.get(77)?.teamId ?? ''],
      78: ['E2', 'I2'],
      79: ['A1', assigned.get(79)?.teamId ?? ''],
      80: ['L1', assigned.get(80)?.teamId ?? ''],
      81: ['D1', assigned.get(81)?.teamId ?? ''],
      82: ['G1', assigned.get(82)?.teamId ?? ''],
      83: ['K2', 'L2'],
      84: ['H1', 'J2'],
      85: ['B1', assigned.get(85)?.teamId ?? ''],
      86: ['J1', 'H2'],
      87: ['K1', assigned.get(87)?.teamId ?? ''],
      88: ['D2', 'G2'],
    }

    const resolveSlot = (slot: string): TeamScores | undefined => {
      if (/^[A-L][12]$/.test(slot)) return slotMap.get(slot)
      return scores.find(s => s.teamId === slot)
    }

    // Build match list with schedule info
    const result: {
      id: number
      home: TeamScores
      away: TeamScores
      date: string
      venueKey: string
    }[] = []

    let matchIndex = 0
    for (let m = 73; m <= 88; m++) {
      const def = matchDefs[m]
      if (!def) continue
      const [homeSlot, awaySlot] = def
      const home = resolveSlot(homeSlot)
      const away = resolveSlot(awaySlot)
      if (!home || !away) continue

      // 真实赛程日期/场地（来自2026世界杯官方赛程）
      const r32RealSchedule: Record<number, { date: string; venueKey: string }> = {
        73: { date: '6月28日', venueKey: 'SoFi体育场' },
        74: { date: '6月29日', venueKey: '吉列体育场' },
        75: { date: '6月29日', venueKey: 'BBVA体育场' },
        76: { date: '6月29日', venueKey: 'NRG体育场' },
        77: { date: '6月30日', venueKey: '大都会人寿体育场' },
        78: { date: '6月30日', venueKey: 'AT&T体育场' },
        79: { date: '6月30日', venueKey: '阿兹特克体育场' },
        80: { date: '7月1日',  venueKey: '梅赛德斯-宾士体育场' },
        81: { date: '7月1日',  venueKey: '李维斯体育场' },
        82: { date: '7月1日',  venueKey: '流明球场' },
        83: { date: '7月2日',  venueKey: 'BMO球场' },
        84: { date: '7月2日',  venueKey: 'SoFi体育场' },
        85: { date: '7月2日',  venueKey: '卑诗体育馆' },
        86: { date: '7月3日',  venueKey: '硬石体育场' },
        87: { date: '7月3日',  venueKey: '箭頭体育场' },
        88: { date: '7月3日',  venueKey: 'AT&T体育场' },
      }
      const sched = r32RealSchedule[m]
      const date = sched?.date ?? r32Dates[matchIndex % r32Dates.length]
      const vk = sched?.venueKey ?? allVenueKeys[matchIndex % allVenueKeys.length]
      result.push({ id: m, home, away, date, venueKey: vk })
      matchIndex++
    }

    return result
  }, [scores, standings])
  if (matches.length === 0) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-8 text-center">
        <p className="text-slate-400">小组赛尚未结束，32强对阵待定。</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-400 text-center mb-2">
        共 {matches.length} 场 · {r32Dates.join('、')}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {matches.map(m => {
          const vi = venueMap[m.venueKey]
          const r32Key = `r32-${m.id - 73}`
          const frozenPred = KNOCKOUT_PREDICTIONS[r32Key]
          const frozenW = KNOCKOUT_WINNERS[r32Key]
          const tag = knockoutModelTag(r32Key)

          // 实际结果（如有）
          const actualScore = LIVE_SCORES[r32Key]
          const hasActual = !!actualScore

          // 决定晋级方和显示用比分
          let homeWon: boolean
          let awayWon: boolean
          let displayScore: string
          let hasExtra = false
          let hasPens = false
          let isCorrect: boolean | null = null   // null=未赛, true=预测对, false=预测错
          let actualDetail = ''

          if (hasActual) {
            displayScore = actualScore!
            const [hS, aS] = actualScore!.split('-').map(Number)
            if (hS > aS) { homeWon = true; awayWon = false }
            else if (aS > hS) { homeWon = false; awayWon = true }
            else {
              // 平局 → 点球决胜
              const penWinner = R32_PENALTY_WINNERS[r32Key] || KNOCKOUT_WINNERS[r32Key]?.winner
              homeWon = penWinner === 'home'
              awayWon = penWinner === 'away'
              hasPens = true
              hasExtra = true
              actualDetail = ' (点球)'
            }
            // 预测准确性
            if (frozenPred) {
              const [pH, pA] = frozenPred.split('-').map(Number)
              const actualWinner = hS > aS ? 'home' : aS > hS ? 'away' : 'draw'
              const predWinner = pH > pA ? 'home' : pA > pH ? 'away' : 'draw'
              if (actualWinner === 'draw' && predWinner === 'draw') {
                // 都预测平局→点球，看方向
                isCorrect = frozenW?.winner === (hS > aS ? 'home' : 'away') ||
                            (hS === aS && frozenW?.winner !== undefined) ? true : false
              } else {
                isCorrect = actualWinner === predWinner
              }
            }
          } else {
            // 未赛：使用尉缭子预测
            homeWon = frozenW ? frozenW.winner === 'home' : true
            awayWon = frozenW ? frozenW.winner === 'away' : false
            hasExtra = frozenW?.hasExtraTime ?? false
            hasPens = frozenW?.hasPenalties ?? false
            displayScore = frozenPred || '0-0'
          }

          // 加时/点球信息只在实际比赛且有点球时才从 KNOCKOUT_WINNERS 读取
          if (hasActual) {
            const kw = KNOCKOUT_WINNERS[r32Key]
            if (kw) {
              hasExtra = kw.hasExtraTime
              hasPens = kw.hasPenalties
            }
          }

          // Live engine for extra-time/penalty score lines in predictions
          const kr = predictFullKnockoutResult(m.home.total, m.away.total)

          return (
            <div
              key={m.id}
              className={`bg-slate-800/60 border rounded-xl p-4 transition-colors ${
                hasActual ? 'border-green-700/40' : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              {/* Date + venue header */}
              <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                <span className="font-semibold text-yellow-400">{m.date}</span>
                <span className="text-right leading-tight">
                  {vi.venue}<br />
                  <span className="text-slate-500">{vi.city}</span>
                </span>
              </div>

              {/* Match pairing */}
              <div className="flex items-center gap-2">
                {/* Home team */}
                <div className={`flex items-center gap-2 min-w-0 flex-1 ${homeWon ? 'opacity-100' : 'opacity-60'}`}>
                  <FlagImg code={m.home.flagCode} size={20} />
                  <span className={`text-sm font-medium truncate ${homeWon ? 'text-white' : 'text-slate-400'}`}>{m.home.teamNameCN}</span>
                  {homeWon && <span className="text-green-400 text-xs flex-shrink-0">✓</span>}
                </div>

                {/* Score display */}
                <div className="flex-shrink-0 px-3 py-1 bg-slate-900/60 rounded-lg border border-slate-600 text-center min-w-[4.5rem]">
                  <span className={`font-bold text-base font-mono leading-tight ${hasActual ? 'text-green-400' : homeWon ? 'text-green-400' : 'text-orange-400'}`}>
                    {displayScore}
                  </span>
                  {hasExtra && !hasActual && kr.afterExtraTime && (
                    <span className="block text-[10px] text-slate-400 font-mono leading-tight">
                      加时 {kr.afterExtraTime[0]}-{kr.afterExtraTime[1]}
                    </span>
                  )}
                  {hasPens && !hasActual && kr.penalties && (
                    <span className="block text-[10px] text-yellow-400 font-mono leading-tight">
                      点球 {kr.penalties[0]}-{kr.penalties[1]}
                    </span>
                  )}
                  {tag && (
                    <span className="block text-[9px] text-purple-400/70 font-medium leading-tight mt-0.5">
                      {tag}
                    </span>
                  )}
                </div>

                {/* Away team */}
                <div className={`flex items-center gap-2 min-w-0 flex-1 justify-end ${awayWon ? 'opacity-100' : 'opacity-60'}`}>
                  {awayWon && <span className="text-green-400 text-xs flex-shrink-0">✓</span>}
                  <span className={`text-sm font-medium truncate ${awayWon ? 'text-white' : 'text-slate-400'}`}>{m.away.teamNameCN}</span>
                  <FlagImg code={m.away.flagCode} size={20} />
                </div>
              </div>

              {/* Group provenance + result line */}
              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                <span>{m.home.group}组 第{['一', '二', '三', '四'][
                  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].indexOf(m.home.group)
                ]} vs {m.away.group}组 第{['一', '二', '三', '四'][
                  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].indexOf(m.away.group)
                ]}</span>
                <span className="text-slate-600">·</span>
                <span className={`font-mono ${
                  m.home.total >= 70 ? 'text-green-400' : 'text-slate-400'
                }`}>评分 {m.home.total.toFixed(0)}</span>
                <span className="text-slate-600">vs</span>
                <span className={`font-mono ${
                  m.away.total >= 70 ? 'text-green-400' : 'text-slate-400'
                }`}>{m.away.total.toFixed(0)}</span>
                <span className="text-slate-600">·</span>
                {hasActual ? (
                  <span className={`text-xs font-semibold ${homeWon ? 'text-green-400' : 'text-orange-400'}`}>
                    {homeWon ? m.home.teamNameCN : m.away.teamNameCN} 晋级{actualDetail}
                    {isCorrect !== null && (
                      <span className={`ml-1 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {isCorrect ? '✅' : '❌'}
                      </span>
                    )}
                    {frozenPred && hasActual && (
                      <span className="ml-1 text-slate-500 font-normal">(预测 {frozenPred})</span>
                    )}
                  </span>
                ) : (
                  <span className={`text-xs font-semibold ${homeWon ? 'text-green-400' : 'text-orange-400'}`}>
                    {homeWon ? m.home.teamNameCN : m.away.teamNameCN} 晋级
                    {hasPens ? ' (点球)' : hasExtra ? ' (加时)' : ''}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
