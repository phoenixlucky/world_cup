## ESPN API 主场客场映射规则

### ESPN 输出格式

`fetch-results.mjs` 的赛事日历输出：
```
TeamA at TeamB | homeScore-awayScore
```

- **`TeamA at TeamB`**：ESPN 用 `at` 表示"做客"，所以 **TeamB 是主场**，TeamA 是客场
- **比分**：ESPN 的比分格式始终是 **`homeScore-awayScore`**（主场进球-客场进球）

### 写入 LIVE_SCORES 的规则

`LIVE_SCORES` 的格式也是 `'homeGoals-awayGoals'`，但这里的 home/away 是指**拓扑（bracket topology）中的 home/away 分配**，不一定等于 ESPN 的 home/away。

所以必须经过一步映射：

1. 从 ESPN 确定**真实比分**：主队进了 X 球、客队进了 Y 球
2. 查拓扑中该 matchId 的 home=谁、away=谁
3. **如果拓扑 home = ESPN 主队** → 直接写入 `'X-Y'`
4. **如果拓扑 home = ESPN 客队** → 写入 `'Y-X'`（互换）

### 实际错误案例

| 场次 | ESPN 输出 | ESPN 真实比分 | 拓扑 home | 错误写入 | 正确写入 |
|------|----------|-------------|----------|---------|---------|
| qf-1 | `Belgium at Spain \| 2-1` | 西班牙 2-1 比利时 | 西班牙 | `'1-2'`（以为是比利时胜） | `'2-1'` |
| qf-0 | `Morocco at France \| 2-0` | 法国 2-0 摩洛哥 | 摩洛哥 | `'2-0'`（以为是摩洛哥胜） | `'0-2'` |

两次错误都是因为没有识别出 ESPN 的 `at` 含义，直接按字面顺序写入。

### 安全流程

每次拉取新结果后：
1. 看 ESPN 输出 `A at B \| X-Y` → 确认 **B(主场) X-Y A(客场)**
2. 检查 `scripts/fetch-results.mjs` 中的 `getMatchId` 和拓扑定义
3. 检查 `src/components/ScheduleView.tsx` 中的 `qfTopology` / `r16Topology` 等确认 home/away
4. 只有确认拓扑 home=ESPN 主场时，才直接写 `'X-Y'`；否则互换
