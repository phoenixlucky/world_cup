/**
 * ThirdPlaceRanking — displays all groups' third-place teams in a ranked table
 *
 * Columns: 排名, 组别, 球队 (with flag), 已赛场次, 积分, 胜/平/负, 进/失球
 * Sorted by points (desc) → GD (desc) → GF (desc)
 */
import { useMemo } from 'react'
import type { TeamScores } from '../engine/scorer'
import type { GroupStanding } from '../engine/standings'
import { FlagImg } from './FlagImg'
import { groupNames } from '../data/teams'

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

interface ThirdPlaceEntry {
  rank: number
  group: string
  teamId: string
  teamNameCN: string
  flagCode: string
  pts: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  gd: number
}

interface Props {
  scores: TeamScores[]
  standings: Map<string, GroupStanding[]>
}

export function ThirdPlaceRanking({ scores, standings }: Props) {
  // Build a teamId → TeamScores lookup
  const teamMap = useMemo(() => {
    const m = new Map<string, TeamScores>()
    for (const s of scores) m.set(s.teamId, s)
    return m
  }, [scores])

  // Extract & sort third-place entries
  const entries = useMemo((): ThirdPlaceEntry[] => {
    const list: ThirdPlaceEntry[] = []

    for (const g of groupNames) {
      const st = standings.get(g)
      if (!st || st.length < 3) continue

      const third = st[2] // 0-indexed, third place
      const team = teamMap.get(third.teamId)
      if (!team) continue

      list.push({
        rank: 0, // will be set after sorting
        group: g,
        teamId: third.teamId,
        teamNameCN: team.teamNameCN,
        flagCode: team.flagCode,
        pts: third.pts,
        wins: third.wins,
        draws: third.draws,
        losses: third.losses,
        gf: third.gf,
        ga: third.ga,
        gd: third.gd,
      })
    }

    // Sort by pts desc → GD desc → GF desc
    list.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.gd !== a.gd) return b.gd - a.gd
      return b.gf - a.gf
    })

    // Assign ranks
    for (let i = 0; i < list.length; i++) {
      list[i].rank = i + 1
    }

    return list
  }, [standings, teamMap])

  if (entries.length === 0) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 text-center text-slate-400">
        暂无小组第三数据
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800 text-slate-400 text-left">
            <th className="px-3 py-3 font-medium whitespace-nowrap">排名</th>
            <th className="px-3 py-3 font-medium whitespace-nowrap">组别</th>
            <th className="px-3 py-3 font-medium whitespace-nowrap">球队</th>
            <th className="px-3 py-3 font-medium text-right whitespace-nowrap">已赛场次</th>
            <th className="px-3 py-3 font-medium text-right whitespace-nowrap">积分</th>
            <th className="px-3 py-3 font-medium text-right whitespace-nowrap">胜/平/负</th>
            <th className="px-3 py-3 font-medium text-right whitespace-nowrap">进/失球</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {entries.map((e) => {
            // Highlight top 8 (the ones that would advance in a 48-team format)
            const isAdvancing = e.rank <= 8

            return (
              <tr
                key={e.teamId}
                className={`hover:bg-slate-700/40 transition-colors ${
                  isAdvancing ? 'bg-green-900/10' : ''
                }`}
              >
                {/* Rank */}
                <td className="px-3 py-2.5">
                  <span className={`font-mono font-bold text-sm ${
                    e.rank <= 3 ? 'text-yellow-400' :
                    e.rank <= 8 ? 'text-green-400' :
                    'text-slate-500'
                  }`}>
                    {e.rank}
                  </span>
                </td>

                {/* Group badge */}
                <td className="px-3 py-2.5">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-mono"
                    style={{
                      backgroundColor: groupColors[e.group]?.bg || '#334155',
                      color: groupColors[e.group]?.text || '#cbd5e1',
                    }}
                  >
                    {e.group}
                  </span>
                </td>

                {/* Team */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="text-xl mr-2">
                    <FlagImg code={e.flagCode} size={20} />
                  </span>
                  <span className="text-white font-medium">{e.teamNameCN}</span>
                </td>

                {/* Matches played (always 3 in group stage) */}
                <td className="px-3 py-2.5 text-right text-slate-300 font-mono">
                  3
                </td>

                {/* Points */}
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <span className={`font-bold font-mono ${
                    e.pts >= 6 ? 'text-green-400' :
                    e.pts >= 4 ? 'text-blue-400' :
                    e.pts >= 3 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {e.pts}
                  </span>
                </td>

                {/* W/D/L */}
                <td className="px-3 py-2.5 text-right font-mono text-slate-300 whitespace-nowrap">
                  <span className="text-green-400">{e.wins}</span>
                  <span className="text-slate-500">/</span>
                  <span className="text-yellow-400">{e.draws}</span>
                  <span className="text-slate-500">/</span>
                  <span className="text-red-400">{e.losses}</span>
                </td>

                {/* GF/GA */}
                <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                  <span className={e.gd > 0 ? 'text-green-400' : e.gd < 0 ? 'text-red-400' : 'text-slate-300'}>
                    {e.gf}:{e.ga}
                  </span>
                  <span className={`ml-1 text-xs ${
                    e.gd > 0 ? 'text-green-400' : e.gd < 0 ? 'text-red-400' : 'text-slate-500'
                  }`}>
                    ({e.gd >= 0 ? '+' : ''}{e.gd})
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
