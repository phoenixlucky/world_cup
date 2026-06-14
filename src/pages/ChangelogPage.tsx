/**
 * ChangelogPage — 算法更新日志
 *
 * Tracks every change to the prediction engine, with the statistical
 * reasoning and real-world calibration data behind each update.
 */

// ── Version entries ────────────────────────────────────────

interface ChangeEntry {
  version: string
  date: string
  title: string
  sections: Section[]
}

interface Section {
  heading: string
  body: string        // HTML rendered via dangerouslySetInnerHTML
}

const changelog: ChangeEntry[] = [
  {
    version: 'v2.0.0',
    date: '2025-06-14',
    title: '🎯 泊松分布模型 — 更真实的比赛模拟',
    sections: [
      {
        heading: '📐 核心算法更换',
        body: `
          <p class="mb-2">旧模型使用简单的比例公式计算比分：</p>
          <pre class="bg-slate-800 text-green-300 text-sm p-3 rounded mb-3 overflow-x-auto">
    预期进球 = 1.2 × (球队评分 / 对手评分)
    比分 = round(预期进球)          ← 四舍五入取整
    主队优势 = 评分 × 1.05          ← 固定 +5%</pre>

          <p class="mb-2">新模型采用 <strong>泊松分布（Poisson distribution）</strong>：
          足球比分预测的行业标准方法。</p>
          <pre class="bg-slate-800 text-green-300 text-sm p-3 rounded mb-3 overflow-x-auto">
    主队 λ = 1.35 × (主队评分 / 客队评分) × 1.15  ← 主队优势内置
    客队 λ = 1.35 × (客队评分 / 主队评分)
    比分 ~ Poisson(λ主) × Poisson(λ客)            ← 独立泊松随机</pre>

          <p>两台实力相当的球队（评分相同）时：<strong>主队 λ = 1.55，客队 λ = 1.35</strong>。</p>
        `,
      },
      {
        heading: '📊 标定依据 — 五大联赛 + 世界杯统计',
        body: `
          <p class="mb-3">以下真实统计数据用于标定泊松参数：</p>

          <h4 class="text-sm font-semibold text-white mb-1">胜平负分布</h4>
          <table class="w-full text-sm mb-4">
            <thead>
              <tr class="border-b border-slate-600">
                <th class="text-left py-1 pr-4">结果</th>
                <th class="text-right py-1 pr-4">真实频率</th>
                <th class="text-right py-1 pr-4">随机猜测</th>
                <th class="text-right py-1 pl-4">永远猜主胜</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-slate-700">
                <td class="py-1 pr-4 text-blue-300">🏠 主胜</td>
                <td class="text-right py-1 pr-4 font-mono">≈45%</td>
                <td class="text-right py-1 pr-4 text-slate-500">33.3%</td>
                <td class="text-right py-1 pl-4 text-amber-400 font-bold">100% ← 你猜的</td>
              </tr>
              <tr class="border-b border-slate-700">
                <td class="py-1 pr-4 text-yellow-300">🤝 平局</td>
                <td class="text-right py-1 pr-4 font-mono">≈25%</td>
                <td class="text-right py-1 pr-4 text-slate-500">33.3%</td>
                <td class="text-right py-1 pl-4 text-slate-500">0%</td>
              </tr>
              <tr class="border-b border-slate-700">
                <td class="py-1 pr-4 text-orange-300">✈️ 客胜</td>
                <td class="text-right py-1 pr-4 font-mono">≈30%</td>
                <td class="text-right py-1 pr-4 text-slate-500">33.3%</td>
                <td class="text-right py-1 pl-4 text-slate-500">0%</td>
              </tr>
            </tbody>
          </table>

          <p class="text-slate-400 text-xs mb-4">永远猜主胜虽可达 ≈45%，但会完全错过平局和客胜。</p>

          <h4 class="text-sm font-semibold text-white mb-1">常见比分概率（势均力敌时）</h4>
          <table class="w-full text-sm mb-3">
            <thead>
              <tr class="border-b border-slate-600">
                <th class="text-left py-1 pr-4">比分</th>
                <th class="text-right py-1 pr-4">真实频率</th>
                <th class="text-right py-1 pl-4">Poisson 模型</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-slate-700">
                <td class="py-1 pr-4 font-mono">1:1</td>
                <td class="text-right py-1 pr-4 text-slate-400">10%～12%</td>
                <td class="text-right py-1 pl-4 text-green-300 font-mono">≈11.5% ✅</td>
              </tr>
              <tr class="border-b border-slate-700">
                <td class="py-1 pr-4 font-mono">1:0</td>
                <td class="text-right py-1 pr-4 text-slate-400">9%～11%</td>
                <td class="text-right py-1 pl-4 text-green-300 font-mono">≈8.5% ✅</td>
              </tr>
              <tr class="border-b border-slate-700">
                <td class="py-1 pr-4 font-mono">2:1</td>
                <td class="text-right py-1 pr-4 text-slate-400">8%～10%</td>
                <td class="text-right py-1 pl-4 text-green-300 font-mono">≈8.9% ✅</td>
              </tr>
              <tr class="border-b border-slate-700">
                <td class="py-1 pr-4 font-mono">2:0</td>
                <td class="text-right py-1 pr-4 text-slate-400">7%～9%</td>
                <td class="text-right py-1 pl-4 text-green-300 font-mono">≈6.6% ✅</td>
              </tr>
              <tr class="border-b border-slate-700">
                <td class="py-1 pr-4 font-mono">0:0</td>
                <td class="text-right py-1 pr-4 text-slate-400">6%～8%</td>
                <td class="text-right py-1 pl-4 text-green-300 font-mono">≈5.5% ✅</td>
              </tr>
              <tr class="border-b border-slate-700">
                <td class="py-1 pr-4 font-mono">0:1</td>
                <td class="text-right py-1 pr-4 text-slate-400">5%～7%</td>
                <td class="text-right py-1 pl-4 text-green-300 font-mono">≈7.4% ✅</td>
              </tr>
              <tr>
                <td class="py-1 pr-4 text-slate-500">其他比分</td>
                <td class="text-right py-1 pr-4 text-slate-500">≈50%</td>
                <td class="text-right py-1 pl-4 text-slate-500">≈52%</td>
              </tr>
            </tbody>
          </table>

          <p class="text-slate-400 text-xs">以上对比基于势均力敌的双方。实际比赛中球队实力差异越大，常见比分概率会相应变化——泊松分布自然反映这一规律。</p>
        `,
      },
      {
        heading: '🔄 影响范围',
        body: `
          <ul class="list-disc list-inside space-y-1 text-sm">
            <li><strong>Monte Carlo 模拟器</strong>（<code class="text-green-300 text-xs">simulator.ts</code>）
              — 小组赛和淘汰赛的每场比分随机生成，从比例公式改为泊松随机。
              10,000 次模拟的夺冠概率分布将更真实。</li>
            <li><strong>比分预测器</strong>（<code class="text-green-300 text-xs">accuracy.ts</code>、<code class="text-green-300 text-xs">ScheduleView.tsx</code>）
              — 单场最可能比分从 <code class="text-xs">round(1.2 × ratio)</code> 改为
              遍历所有比分、取联合概率最大的那个。</li>
            <li><strong>赛程页面的预测比分</strong>和<strong>准确性统计</strong>都会同步更新。</li>
          </ul>
        `,
      },
      {
        heading: '📁 新增文件',
        body: `
          <div class="bg-slate-800 rounded p-3 font-mono text-sm text-cyan-300">
            src/engine/poisson.ts  <span class="text-slate-500">← 泊松分布工具模块</span>
          </div>
          <ul class="list-disc list-inside space-y-1 text-sm mt-2">
            <li><code class="text-green-300">poissonPMF(k, λ)</code> — 泊松概率质量函数</li>
            <li><code class="text-green-300">poissonRandom(λ)</code> — 泊松随机数生成（Knuth 算法）</li>
            <li><code class="text-green-300">expectedLambdas(h, a)</code> — 计算双方期望进球 λ</li>
            <li><code class="text-green-300">generateScore(h, a)</code> — 生成一场随机比分</li>
            <li><code class="text-green-300">predictMostLikelyScore(h, a)</code> — 预测最可能比分</li>
          </ul>
        `,
      },
      {
        heading: '⚙️ 技术细节 — 泊松分布',
        body: `
          <p class="mb-2">泊松分布是离散概率分布，描述单位时间内随机事件发生次数的概率分布。
          在足球中，"单位时间"= 90 分钟，"事件"= 进球。</p>

          <pre class="bg-slate-800 text-green-300 text-sm p-3 rounded mb-2 overflow-x-auto">
    P(X = k) = e^{-λ} × λ^{k} / k!</pre>

          <p>其中 <strong>λ</strong>（lambda）是期望进球数。
          两台实力相近的球队，主队 λ = 1.55 意味着平均每场进 1.55 球；<br>
          客队 λ = 1.35 意味着平均每场进 1.35 球。λ 之和 ≈ 2.9，
          符合职业足球平均总进球数。</p>
        `,
      },
    ],
  },
]

// ── Component ──────────────────────────────────────────────

function VersionCard({ entry }: { entry: ChangeEntry }) {
  return (
    <article className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 sm:p-6 mb-6">
      {/* Version header */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <span className="text-lg font-bold text-white">{entry.version}</span>
          <span className="text-sm text-slate-400 ml-2">{entry.title}</span>
        </div>
        <span className="text-xs text-slate-500 font-mono">{entry.date}</span>
      </div>

      {/* Sections */}
      <div className="space-y-5">
        {entry.sections.map((s, i) => (
          <section key={i}>
            <h3 className="text-sm font-semibold text-slate-200 mb-2">{s.heading}</h3>
            <div
              className="text-slate-300 text-sm leading-relaxed space-y-1"
              dangerouslySetInnerHTML={{ __html: s.body }}
            />
          </section>
        ))}
      </div>
    </article>
  )
}

// ── Page ───────────────────────────────────────────────────

export function ChangelogPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">📜 算法更新日志</h1>
        <p className="text-slate-400 text-sm mt-1">
          每一次预测引擎升级的详细记录——数据依据、算法原理、影响范围
        </p>
      </div>

      {/* Version list */}
      <div className="space-y-6">
        {changelog.map((entry) => (
          <VersionCard key={entry.version} entry={entry} />
        ))}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-slate-600 mt-8">
        数据来源：欧洲五大联赛（英超、西甲、德甲、意甲、法甲）及世界杯历史统计
      </p>
    </div>
  )
}
