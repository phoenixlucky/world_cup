/**
 * WeightPanel — drag sliders to adjust each dimension's weight
 */
import type { Weights } from '../engine/scorer'

interface Props {
  weights: Weights
  onChange: (w: Weights) => void
}

const labels: { key: keyof Weights; label: string; color: string }[] = [
  { key: 'rank', label: '🏅 名次加权', color: '#3b82f6' },
  { key: 'marketVal', label: '💰 身价加权', color: '#22c55e' },
  { key: 'goals', label: '⚽ 进球加权', color: '#eab308' },
  { key: 'attackDefense', label: '🛡️ 攻防专项', color: '#06b6d4' },
  { key: 'opponentStrength', label: '📊 对手强度', color: '#8b5cf6' },
  { key: 'wins', label: '🏆 胜场加权', color: '#a855f7' },
  { key: 'form', label: '📈 状态加权', color: '#ec4899' },
  { key: 'luck', label: '🍀 运气加权', color: '#f97316' },
  { key: 'hostBonus', label: '🌍 州加成', color: '#14b8a6' },
]

export function WeightPanel({ weights, onChange }: Props) {
  const handleChange = (key: keyof Weights, value: number) => {
    onChange({ ...weights, [key]: value })
  }

  const total = Object.values(weights).reduce((a, b) => a + b, 0)

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">⚖️ 权重调节</h2>
        <span className="text-sm text-slate-400">总分: {total}</span>
      </div>

      <div className="space-y-3">
        {labels.map(({ key, label, color }) => (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300">{label}</span>
              <span className="text-white font-mono font-medium">{weights[key]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={weights[key]}
              onChange={e => handleChange(key, Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                         bg-slate-600 accent-blue-500
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:w-5
                         [&::-webkit-slider-thumb]:h-5
                         [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:shadow-lg
                         sm:[&::-webkit-slider-thumb]:w-4
                         sm:[&::-webkit-slider-thumb]:h-4"
              style={{ accentColor: color }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={() =>
          onChange({ rank: 15, marketVal: 10, goals: 8, attackDefense: 20, opponentStrength: 11, wins: 16, form: 10, luck: 5, hostBonus: 5 })
        }
        className="mt-4 w-full py-3 sm:py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200
                   rounded-lg text-sm font-medium transition-colors"
      >
        🔄 恢复默认
      </button>
    </div>
  )
}
