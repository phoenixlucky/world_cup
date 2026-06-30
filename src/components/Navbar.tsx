/**
 * Navbar — top navigation bar with responsive hamburger drawer on mobile
 */
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { FlagImg } from './FlagImg'

const links = [
  { to: '/', label: '📊 排名', title: '综合评分排行榜' },
  { to: '/groups', label: '📋 小组赛', title: '12 小组对阵' },
  { to: '/knockout', label: '🏆 淘汰赛', title: '32 强晋级树' },
  { to: '/round32', label: '⚔️ 32强赛程', title: '32 强淘汰赛对阵' },
  { to: '/prediction', label: '🔮 冠军预测', title: '蒙特卡洛夺冠概率' },
  { to: '/schedule', label: '📅 赛程', title: '比赛日程查询' },
  { to: '/accuracy', label: '📊 准确性', title: '预测准确性统计' },
  { to: '/knockout-accuracy', label: '⚔️ 淘汰赛准确性', title: '尉缭子分析法32强准确性' },
  { to: '/changelog', label: '📜 更新日志', title: '算法更新记录' },
  { to: '/world-cup-perf', label: '🏅 世界杯表现', title: '各队表现评分' },
  { to: '/third-place', label: '🥉 小组第三', title: '小组第三排行榜' },
]

export function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-slate-300 hover:text-white hover:bg-slate-700'
    }`

  return (
    <>
      {/* Top bar */}
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <span className="flex items-center gap-1 text-lg font-bold text-white tracking-tight whitespace-nowrap">
              <FlagImg code="CA" size={16} /><FlagImg code="MX" size={16} /><FlagImg code="US" size={16} />
              2026 世界杯预测
            </span>

            {/* Desktop nav (hidden on mobile) */}
            <div className="hidden md:flex gap-1">
              {links.map(l => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  title={l.title}
                  className={linkClass}
                >
                  {l.label}
                </NavLink>
              ))}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              aria-label="打开导航菜单"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Drawer panel */}
          <div
            className="absolute top-0 right-0 h-full w-64 max-w-[80vw] bg-slate-900 border-l border-slate-700 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-700">
              <span className="text-sm font-semibold text-slate-300">导航菜单</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                aria-label="关闭导航菜单"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer links */}
            <div className="p-4 space-y-1">
              {links.map(l => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  title={l.title}
                  onClick={() => setDrawerOpen(false)}
                  className={linkClass}
                >
                  {l.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
