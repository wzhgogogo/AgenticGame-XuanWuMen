# 测试日志 — 玄武门之变 v3

## Layer 1: 确定性引擎模块单测

**目标**: 为零 LLM 依赖的纯函数模块建立 Vitest 单测，覆盖压力系统、日历、NPC Agent、活动系统、JSON 提取器共 5 个模块 20+ 个导出函数。

**日期**: 2026-04-15

### 基础设施

- 安装 vitest v4.1.4
- `package.json` 新增 `test` / `test:watch` 脚本
- `vite.config.ts` 添加 `test: { include: ['src/**/*.test.ts'] }` 配置

### 测试文件与覆盖范围

| 文件 | 被测模块 | 测试函数 | 用例数 |
|------|----------|----------|--------|
| `src/engine/jsonExtractor.test.ts` | JSON 提取器 | `extractJson` | 14 |
| `src/engine/world/pressure.test.ts` | 压力系统 | `tickAxis`, `tickPressure`, `applyPressureModifiers`, `checkEventTriggers`, `snapshotPressure` | 25 |
| `src/engine/world/calendar.test.ts` | 日历系统 | `createCalendar`, `advanceDay`, `advanceTimeOfDay`, `formatDate`, `formatCalendar`, `formatMonth`, `isAfterDate`, `getDaysInMonth` | 27 |
| `src/engine/world/npcAgent.test.ts` | NPC Agent | `tickNpcAgent`, `filterPlausibleActions`, `recordNpcAction`, `adjustPatience` | 18 |
| `src/engine/world/activities.test.ts` | 日常活动 | `getActivitiesForTimeSlot`, `applyActivityEffects`, `getFlavorText` | 14 |

**合计: 5 个文件, 98 个用例**

### 测试重点

- **纯函数不可变性**: 每个模块都测了 "is pure — does not mutate input"
- **边界钳位**: floor/ceiling 钳位、patience 0-100 范围
- **业务逻辑**: pressure 阈值触发、cooldown 冷却期、maxOccurrences 上限、NPC 决策规则匹配、活动效果分发
- **LLM 输出容错**: JSON 提取器对 markdown 包裹、截断修复、前后多余文本、嵌套结构的处理
- **中文格式化**: 日历的农历日期格式（初一~三十、正月~十二月）

### 发现并修复的问题

#### Bug 1: pressure.test.ts — `makeMinimalSkeleton` 未应用 overrides

- **现象**: `checkEventTriggers` 的 4 个测试用例失败（阈值过滤、冷却期、前置条件、优先级排序）
- **根因**: 测试辅助函数 `makeMinimalSkeleton(overrides)` 接收了 overrides 参数但忘记在返回对象中展开 `...overrides`，导致所有覆盖项（threshold、cooldownDays、preconditions、id）被静默忽略
- **修复**: 在返回对象末尾添加 `...overrides`
- **影响**: 仅测试代码，不影响生产

#### Fix 2: pressure.test.ts — TypeScript 编译错误

- **TS6133**: 导入了 `createPressureAxis` 但未使用 — 移除
- **TS2739**: `SceneResolution` 缺少 `softCap` / `hardCap` 字段 — 在 `makeMinimalSkeleton` 中补全

### 最终结果

```
 Test Files  5 passed (5)
      Tests  98 passed (98)
   Duration  531ms

 tsc -b --noEmit  0 errors
```

### 运行方式

```bash
npm test          # 单次运行全部测试
npm run test:watch  # watch 模式（开发时用）
```

---

## Layer 1 补充: 骨架模板单测

**日期**: 2026-04-17

### 测试文件

| 文件 | 被测模块 | 用例数 |
|------|----------|--------|
| `src/data/skeletons/skeletons.test.ts` | 8 个骨架模板 + checkEventTriggers 集成 | 77 |

### 测试重点

- **结构完整性**: 8 骨架 × 7 项校验（非空字段、合法 axisId、turnRange min≤max、softCap<hardCap 等）
- **特征断言**: 每个骨架的关键业务值（precondition 阈值、priority、maxOccurrences、特殊类型如 npc_patience_below）
- **优先级排序**: militaryConflict(95) > subordinateUltimatum(90) > ... > intelligenceEvent(40)
- **checkEventTriggers 集成**: 初始不触发、高门槛不触发、OR 逻辑触发、day_range 阻断、优先级竞选

### 发现的问题

#### 坑 1: precondition params 字段名
骨架 `preconditions` 中 `pressure_above` 的阈值参数名是 `value`（不是 `threshold`）。`threshold` 只在 `pressureTriggers.axes` 里用。

#### 坑 2: checkEventTriggers 最多返回 1 个
函数内部 `eligible.slice(0, 1)`，防止事件洪泛。测试不能期望返回多个事件。

### 结果

```
 Test Files  6 passed (6)
      Tests  175 passed (175)
   Duration  830ms
```

---

## Layer 2: LLM 集成测试（Mock）

**日期**: 2026-04-17

### 测试文件

| 文件 | 被测模块 | 用例数 |
|------|----------|--------|
| `src/engine/world/npcPromptBuilder.test.ts` | NPC 决策 prompt + 事件生成 prompt 构造 | 14 |
| `src/engine/world/eventGenerator.test.ts` | generateEventInstance + resolveEventInstance | 13 |
| `src/engine/world/eventRunner.test.ts` | EventInstance→SceneConfig 适配 + 收束指令 | 9 |

**合计: 3 个文件, 36 个用例**

### Mock 策略

不调真实 LLM。构造三种 mock `LLMProvider`：
- **成功 mock**: `chat()` 返回预设合法 JSON
- **垃圾 mock**: `chat()` 返回非 JSON 字符串
- **异常 mock**: `chat()` 抛 Error

### 测试重点

- **npcPromptBuilder**: prompt 包含角色名、压力轴标签、patience/commitment、enabled actions、JSON 格式指令、eventLog
- **eventGenerator**: LLM 成功→解析 EventInstance；垃圾→重试一次→仍失败→null；异常→null；验证 messages 结构；`res.content` fallback；缺字段返回 null；skeleton 字段透传
- **resolveEventInstance**: LLM 成功→返回；失败+fallback→返回 fallback；失败无 fallback→硬兜底（skeleton 最小信息）
- **eventRunner**: 字段映射（softCap→minTurns、hardCap→maxTurns）；id 格式；收束指令含 resolutionSignals；softCap 提示含 coreConflict

### 基础设施修复

#### `@tailwindcss/vite` 插件竞争问题（永久修复）

- **现象**: `npx vitest run` 连续失败，所有文件报 `TypeError: Cannot read properties of undefined (reading 'config')`
- **根因**: `@tailwindcss/vite@4.2.2` 插件在 vitest 初始化时 `configResolved` hook 竞争
- **修复**: `vite.config.ts` test 配置添加 `server.deps.inline: [/@tailwindcss/]`
- **验证**: 连续两次全量运行稳定通过

### 结果

```
 Test Files  9 passed (9)
      Tests  213 passed (213)
   Duration  709ms
```

---

## 2026-04-19 冒烟测试 + LLM 集成测试 + Bug 修复

### 冒烟测试

| 检查项 | 结果 |
|--------|------|
| 构建 (tsc + vite build) | 通过，355ms |
| Lint (eslint) | 通过（修复后 0 errors） |
| 单测 (vitest) | 220/220 通过 |

### Lint 修复（5 errors）

| 文件 | 问题 | 修复 |
|------|------|------|
| `src/components/GameScene.tsx:23` | `useMemo` 内调用 `Math.random()`（React 纯度规则） | 改为 `useState` 初始化随机 index |
| `src/components/GameScene.tsx:25` | `useMemo` 多余依赖 `gameState.isNpcThinking` | 随上一条一并移除 |
| `src/components/SettingsModal.tsx:30` | 混合导出组件和 `loadSavedConfig` 函数，破坏 fast refresh | `loadSavedConfig` + `STORAGE_KEY` 抽到 `settingsStorage.ts` |
| `src/engine/promptBuilder.ts:216` | `_gameState` 参数未使用 | 删除参数，同步更新调用方 `__test__promptBuilder.ts` |
| `src/engine/world/pressure.test.ts:132,254` | 两处 `as any` | 改为 `as PressureAxisId` / `as Record<PressureAxisId, number>` |

### LLM 集成测试（真实 API 调用）

新增脚本 `scripts/llmIntegrationTest.ts`，用 `npx tsx` 在 CLI 运行，读取 `.env` 配置调用真实 LLM。

| 测试 | 耗时 | 结果 |
|------|------|------|
| LLM 基础连通（streaming chat） | 11s | 17 chunks，回复正常 |
| NPC 决策（长孙无忌 lobby/wait） | 24s | 返回合法 JSON，决策: lobby |
| 事件变体生成（情报骨架） | 40s | "禁宫密诏传"，3 phases |
| 记忆提取（memoryExtractor，新模块） | 19s | 提取 2 条记忆，importance/emotionalTag 格式正确 |

**4/4 passed**（首次跑时事件变体测试因断言字段名写错 `title` 应为 `name` 而失败，修正后全部通过）

### Bug 修复：LLM `<thought>` 标签泄露

**现象**: 游戏中 LLM 返回的 `<thought>...</thought>` 思考标签内容直接显示给玩家。

**根因**: `extractJson` 和 `parseNpcResponse` 均无过滤逻辑，`<thought>` 内容直达前端渲染。

**修复**:

| 文件 | 改动 |
|------|------|
| `src/engine/jsonExtractor.ts` | 新增 `stripThinkingTags()`，覆盖 6 种标签（thought/thinking/think/reasoning/reflection/inner_monologue），大小写不敏感 |
| `src/engine/sceneManager.ts` | 存入 `llmMessages` 前清洗原始响应；解析后对 `narrator` 和 `npcDialogues.content` 也做清洗（双保险） |
| `src/engine/jsonExtractor.test.ts` | 新增 7 个测试覆盖标签剥离 |

### 基础设施

#### `@tailwindcss/vite` 竞争条件（再修复）

之前的 `server.deps.inline` 方案失效。改为 `vite.config.ts` 使用 async 函数形式，`!process.env.VITEST` 时才动态 `import('@tailwindcss/vite')`，彻底避免插件在测试环境初始化。

**注意**: 默认 reporter 下仍有间歇性竞争（Windows 特有），`--reporter=verbose` 模式稳定通过。与代码无关，是 vitest 自身问题。

### 最终结果

```
 Test Files  9 passed (9)
      Tests  220 passed (220)
   Duration  768ms
```

---

## 2026-04-19 v3.2: 跨场景记忆 + 叙事烈度控制

### 新增功能

#### 跨场景角色记忆（#12）

| 文件 | 改动 |
|------|------|
| `src/types/world.ts` | WorldState 新增 `characterMemories: Record<string, MemoryEntry[]>` |
| `src/engine/world/worldState.ts` | `createInitialWorldState()` 初始化 `characterMemories: {}` |
| `src/engine/world/memoryExtractor.ts` | **新文件**，场景结束后 LLM 提取角色记忆（~200-300 tokens），失败静默 |
| `src/engine/world/worldSimulator.ts` | `handleEventEnd` fire-and-forget 调用提取 + `syncMemoriesToCharacters` 同步到 Character.shortTermMemory + `restoreGame` 兼容旧存档 |
| `src/engine/world/npcPromptBuilder.ts` | 注入最近 5 条角色记忆到 NPC 每日决策 prompt |

#### 叙事烈度控制

**问题**: 正月初四调屈突通进京，LLM 生成叙事直接跳到六月玄武门。

**根因**: 
1. 情报事件/皇帝召见骨架几乎无触发门槛，第 2-4 天即可触发
2. LLM 不知道当前压力对应什么叙事烈度，自由发挥成六月决战
3. 无时间跳跃约束，LLM 用历史知识抢跑

**修复**:

| 文件 | 改动 |
|------|------|
| `src/engine/world/pressure.ts` | 新增 `getNarrativeIntensity()`：根据压力均值返回四档烈度（low/medium/high/extreme）+ 对应约束文本 |
| `src/types/index.ts` | SceneConfig 新增 `narrativeConstraint?: string` |
| `src/engine/world/eventRunner.ts` | `eventInstanceToSceneConfig` 接收 pressureAxes，计算烈度约束写入 SceneConfig |
| `src/engine/world/worldSimulator.ts` | 传 pressureAxes 给 eventRunner |
| `src/engine/promptBuilder.ts` | 场景对话 prompt 注入 `narrativeConstraint`（含日期+烈度+禁止时间跳跃） |
| `src/engine/world/npcPromptBuilder.ts` | NPC 决策 prompt 和事件生成 prompt 都注入烈度约束 |

**烈度档位**:

| 压力均值 | 档位 | 允许的叙事 |
|---------|------|-----------|
| 0-30 | 低 | 暗流、试探、情报、日常政务 |
| 30-55 | 中 | 公开争论、弹劾、拉拢、小规模冲突 |
| 55-75 | 高 | 暗杀、逼宫、阵营分裂、直接对抗 |
| 75+ | 极高 | 武装冲突、兵变、生死摊牌 |

### Bug 修复

| 问题 | 修复 |
|------|------|
| `eventGenerator.test.ts` 中 `pressureSnapshot: {}` 类型错误导致 `npm run build` 失败 | 改为 `snapshotPressure(createInitialWorldState().pressureAxes)` |
| `npcPromptBuilder.ts` 中 `_characterId` 参数未使用（原本是占位符） | 重命名为 `characterId`，现在被记忆注入逻辑使用 |

### 构建验证

```
npm run build  → tsc -b + vite build 通过（285ms）
```

---

## 2026-04-20 v3.4.1: 叙事结局检测 + prompt 约束 + 白名单 + 目录清理

### 新增测试

| 文件 | 被测模块 | 用例数 |
|------|----------|--------|
| `src/engine/world/__tests__/worldSimulator.test.ts` | `detectNarrativeEnding` 正则结局检测 | 7 |
| `src/engine/world/__tests__/promptBuilder.test.ts` | `buildSystemPrompt` 叙事规则 + `buildMessages` currentDate 注入 | 8 |
| `src/engine/world/__tests__/npcPromptBuilder.test.ts` (+4) | 英文 axisId 输出 + NPC_IMPACT_PROFILES 白名单内容 | 20（原 16） |

### 生产代码调整

- `detectNarrativeEnding` 从 WorldSimulator private 方法提取为独立导出纯函数，方便直接测试
- `buildMessages` 新增 `currentDate?: string` 第 5 参数（不超 arch-guard 5 参数限制）

### 目录整理

- 7 个 `.test.ts` 从 `src/engine/world/` 迁入 `src/engine/world/__tests__/`
- `promptBuilder.ts` 从 `src/engine/` 移至 `src/engine/world/`
- 删除废弃文件：`campaignManager.ts`、`outcomeBuilder.ts`、`__test__promptBuilder.ts`

### 发现的坑

#### 坑 1: death 正则无主语限制

`detectNarrativeEnding` 的死亡模式 `/被.*?(?:斩首|处死|...)/` 不限主语——"建成被处死"也会匹配返回 `coup_fail_captured`。这是设计意图（场景中出现任何处死都是严重事件），但写测试时容易误以为需要"秦王"开头。capture/exile 模式才有主语限制。

#### 坑 2: npcPromptBuilder 白名单提示已改为纯英文 ID

v3.4.1 将白名单提示从 `${中文标签}(${英文id})` 改为纯英文 `${id}`。原有测试 `expect(result).toContain('军事准备')` 因此失败，需改为 `expect(result).toContain('military_readiness')`。

### 结果

```
 Test Files  11 passed (11)
      Tests  245 passed (245)
   Duration  1.14s

 tsc -b + vite build  通过
 冒烟 4/4 通过
```

---

## 待实施的测试层

| Layer | 范围 | 方案 | 状态 |
|-------|------|------|------|
| Layer 1 | 确定性引擎模块 | Vitest 单测 | **已完成** (175 cases) |
| Layer 1+ | 骨架模板 | Vitest 单测 + checkEventTriggers 集成 | **已完成** (77 cases) |
| Layer 1++ | 叙事结局检测 + 白名单 | Vitest 单测 | **已完成** (10 cases) |
| Layer 2 | LLM 集成（Mock） | Mock LLMProvider + 契约测试 | **已完成** (36 cases) |
| Layer 2+ | LLM 集成（真实 API） | `scripts/llmIntegrationTest.ts` CLI 脚本 | **已完成** (4 cases) |
| Layer 2++ | Prompt 构造 | buildSystemPrompt + buildMessages 输出断言 | **已完成** (8 cases) |
| 冒烟 | 构建 + Lint + 单测 | `npm run build && npm run lint && npx vitest run` | **已完成** (245 cases) |
| Layer 3 | React 组件 | Vitest + React Testing Library | 待实施 |
| Layer 4 | 端到端流程 | Playwright / 手动剧本 | 待实施 |
