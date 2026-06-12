# 🇨🇦🇲🇽🇺🇸 2026 世界杯预测

基于 7 维加权模型的 2026 年世界杯预测系统，结合**名次加权**、**身价加权**、**进球加权**、**胜场加权**、**状态加权**、**运气加权**、**州加成** 进行预测，支持蒙特卡洛模拟。

## 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 浏览器打开 http://localhost:5173
```

## 构建

```bash
npm run build     # 生产构建 → dist/

npm run preview   # 预览构建结果
```

## 部署 (GitHub Pages)

推送 `main` 分支后，GitHub Actions 自动构建部署到：

```
https://phoenixlucky.github.io/world_cup/
```

### 手动部署

```bash
npm run deploy
```

## 技术栈

- **框架**: React 19 + TypeScript
- **构建**: Vite 8
- **样式**: Tailwind CSS 4
- **图表**: Recharts
- **路由**: React Router 7

## 项目结构

```
src/
├── data/           # 球队种子数据（48 队）
├── engine/         # 预测引擎
│   ├── scorer.ts   # 7 维度评分 + 权重系统
│   └── simulator.ts # 蒙特卡洛模拟器
├── hooks/          # React Hooks
│   ├── useTeamData.ts
│   └── useSimulation.ts
├── components/     # UI 组件
│   ├── Navbar.tsx
│   ├── WeightPanel.tsx
│   ├── TeamRankingTable.tsx
│   ├── GroupView.tsx
│   ├── BracketView.tsx
│   ├── ChampionPrediction.tsx
│   ├── ScheduleView.tsx
│   └── FlagImg.tsx
└── pages/          # 页面
    ├── HomePage.tsx        # 排名
    ├── GroupsPage.tsx      # 小组赛
    ├── KnockoutPage.tsx    # 淘汰赛
    ├── PredictionPage.tsx  # 冠军预测
    └── SchedulePage.tsx    # 赛程
```

## 数据来源

- 赛程数据来自 [Wikipedia](https://zh.wikipedia.org/wiki/2026%E5%B9%B4%E5%9C%8B%E9%9A%9B%E8%B6%B3%E5%8D%94%E4%B8%96%E7%95%8C%E7%9B%83)
- FIFA 排名、球队身价使用静态种子数据（可在 `.env` 中配置 `VITE_FOOTBALL_DATA_KEY` 启用实时数据）
