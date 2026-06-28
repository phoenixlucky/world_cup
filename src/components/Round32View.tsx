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
import { predictMostLikelyScore } from '../engine/poisson'
import { computeScores, DEFAULT_WEIGHTS } from '../engine/scorer'
import { teams } from '../data/teams'
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
    const allThird: { team: TeamScores; pts: number; gd: number; gf: number }[] = []
    for (const [g, ranked] of groupRanked) {
      if (ranked[0]) slotMap.set(`${g}1`, ranked[0])
      if (ranked[1]) slotMap.set(`${g}2`, ranked[1])
      if (ranked[2]) {
        const st = standings.get(g)?.find(s => s.teamId === ranked[2].teamId)
        allThird.push({ team: ranked[2], pts: st?.pts ?? 0, gd: st?.gd ?? 0, gf: st?.gf ?? 0 })
      }
    }

    allThird.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.gd !== a.gd) return b.gd - a.gd
      return b.gf - a.gf
    })
    const bestThird = allThird.slice(0, 8)

    const thirdMatchOrder = [74, 77, 79, 80, 81, 82, 85, 87]
    const assigned = new Map<number, TeamScores>()
    for (let i = 0; i < Math.min(bestThird.length, 8); i++) {
      assigned.set(thirdMatchOrder[i], bestThird[i].team)
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

      const date = r32Dates[matchIndex % r32Dates.length]
      const vk = allVenueKeys[matchIndex % allVenueKeys.length]
      result.push({ id: m, home, away, date, venueKey: vk })
      matchIndex++
    }

    return result
  }, [scores, standings])

  // ── Predictions ───────────────────────────────────────────
  const teamScoreMap = useMemo(() => {
    const sc = computeScores(teams, DEFAULT_WEIGHTS)
    const map = new Map<string, number>()
    for (const s of sc) map.set(s.teamId, s.total)
    return map
  }, [])

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
          const [predH, predA] = predictMostLikelyScore(m.home.total, m.away.total)

          return (
            <div
              key={m.id}
              className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 hover:border-slate-500 transition-colors"
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
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FlagImg code={m.home.flagCode} size={20} />
                  <span className="text-white text-sm font-medium truncate">{m.home.teamNameCN}</span>
                </div>

                {/* Predicted score */}
                <div className="flex-shrink-0 px-3 py-1 bg-slate-900/60 rounded-lg border border-slate-600 text-center min-w-[4rem]">
                  <span className="text-orange-400 font-bold text-base font-mono">
                    {predH}-{predA}
                  </span>
                </div>

                {/* Away team */}
                <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                  <span className="text-white text-sm font-medium truncate">{m.away.teamNameCN}</span>
                  <FlagImg code={m.away.flagCode} size={20} />
                </div>
              </div>

              {/* Group provenance */}
              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
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
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
