/**
 * Navbar — top navigation bar
 */
import { NavLink } from 'react-router-dom'
import { FlagImg } from './FlagImg'

const links = [
  { to: '/', label: '📊 排名', title: '综合评分排行榜' },
  { to: '/groups', label: '📋 小组赛', title: '12 小组对阵' },
  { to: '/knockout', label: '🏆 淘汰赛', title: '32 强晋级树' },
  { to: '/prediction', label: '🔮 冠军预测', title: '蒙特卡洛夺冠概率' },
  { to: '/schedule', label: '📅 赛程', title: '比赛日程查询' },
]

export function Navbar() {
  return (
    <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <span className="flex items-center gap-1 text-lg font-bold text-white tracking-tight whitespace-nowrap">
            <FlagImg code="CA" size={16} /><FlagImg code="MX" size={16} /><FlagImg code="US" size={16} />
            2026 世界杯预测
          </span>
          <div className="flex gap-1 overflow-x-auto">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                title={l.title}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
