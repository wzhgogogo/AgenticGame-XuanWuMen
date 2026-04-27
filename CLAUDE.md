# CLAUDE.md — 项目指引

## 项目概述

玄武门之变 v3.4.4：LLM 驱动的涌现式历史互动叙事游戏。玩家扮演秦王李世民，在武德九年的半年博弈中做出抉择。

核心设计：没有固定剧情线。7 条压力轴驱动世界运转，6 个核心 NPC（秦王府三人 + 太子建成 / 齐王元吉 / 皇帝李渊）作为自主 Agent 每日决策，事件从压力积累中自然涌现。幕后 Agent 当前为空，等待补充其他历史人物（秦叔宝、程咬金、魏征等）作为背景压力贡献者。

## 构建与运行

```bash
npm run dev      # 启动 Vite 开发服务器
npm run build    # tsc -b && vite build（生产构建）
npm run lint     # ESLint
```

需要 `.env` 配置 LLM API：`VITE_LLM_API_KEY`、`VITE_LLM_PROVIDER`、`VITE_LLM_MODEL`、`VITE_LLM_BASE_URL`（可选）

### 测试

```bash
npx vitest run                              # 全量单测（302 用例）
npx vitest run --exclude 'scripts/**'       # 只跑 src 下的单测
npx vitest run scripts/autoplay.test.ts     # 自动跑局（需要 LLM API，⚠️ 当前不稳定）
npx tsx scripts/evalPlaythrough.ts <log>    # 评估跑局日志（log 在 scripts/logs/ 下，按时间戳命名）
npx tsx scripts/llmIntegrationTest.ts       # LLM 接口冒烟测试
```

## 架构核心

### 状态机流转

```
title_screen → daily_activities → daily_briefing → [event_scene] → daily_activities → ... → game_over
```

- `WorldSimulator`（src/engine/world/worldSimulator.ts）驱动整个流程
- `App.tsx` 订阅 WorldSimulator 状态，按 GameMode 渲染不同组件

### 压力系统

7 条压力轴（src/engine/world/pressure.ts），各轴 0-100：
- succession_crisis、jiancheng_hostility、yuanji_ambition、court_opinion、qinwangfu_desperation、imperial_suspicion、military_readiness
- 每轴有 value / velocity / baseline / floor / ceiling / decayRate
- 三通道变化：时间漂移 tick（确定性）、NPC 行为、玩家活动

### 事件系统

两层架构：
- **骨架模板**（src/data/skeletons/）：11 种事件类型，定义结构、触发条件、约束、tagged outcomeEffects（success/partial/failure/disaster）
- **LLM 变体生成**（src/engine/world/eventGenerator.ts）：根据当前世界状态填充具体细节
- **场景适配**（src/engine/world/eventRunner.ts）：EventInstance → SceneConfig，复用现有 SceneManager
- **outcome 选择**：场景结束时 LLM 在 JSON 中返回 chosenOutcome ∈ {success, partial, failure, disaster}，worldSimulator.handleEventEnd 据此筛 tag === chosenOutcome 的 outcome 全部生效（applyOutcomeEffects 单一入口，覆盖压力/夺官/失盟/伤将/夺兵权/置 flag 六种 kind）

### 结局系统（v3.4.4）

5 结局光谱（src/engine/world/endingResolver.ts，优先级链 F5 → E3 → E1 → F1 → 第 180 天 N1）：
- **E1 玄武门成功** `coup_success`：玩家发动武力 + 关键盟友 ≥2 active + military_readiness ≥60
- **E3 惨胜** `coup_fail_civil_war_win`：武力胜利但 ≥1 名核心盟友已 deceased/imprisoned
- **F1 政治终局** `deposed`：多名官职被剥夺 或 关键 NPC ≥2 非 active
- **F5 武力发动失败** `coup_fail_captured`：触发武力但兵力上限 < 50 或核心 NPC 已损耗
- **N1 时光流逝** `peace`：第 180 天到达，无以上触发

EndingType 字面量保持不变；UI 与 evalPlaythrough 通过 src/data/endings.ts 的 ENDING_LABELS 映射读取 code 'E1'/'E3'/... 与中文 name。

### 资产剥夺与 NPC 状态

- **OutcomeEffect**（discriminated union, src/types/world.ts）：pressure / loseNpc / injureNpc / loseOffice / confiscateMilitary / flag
- **NpcStatus**：active / exiled / imprisoned / deceased / dispatched。worldSimulator 在 runWorldTick 决策阶段过滤非 active NPC，sceneManager 不重复过滤
- **PlayerOffice**（5 官职：天策上将 / 尚书令 / 司空 / 雍州牧 / 左武卫大将军）：loseOffice 通过 militaryCeilingContribution 反向改写 pressureAxes.military_readiness.ceiling
- **FlagKey 白名单**（src/data/flags.ts）：所有 flag-kind outcome 必须使用枚举内的 key，applyOutcomeEffects 强制校验

### 快进机制（v3.4.4）

- src/engine/world/fastForward.ts 提供纯只读 planFastForward()
- WorldSimulator.fastForward(maxDays) 循环 endDay+proceedFromBriefing，每天重 plan，遇 pendingEvents/event_scene/game_over 立刻退出
- DailyActivityScreen 提供 [快进 3 日] [快进 7 日] 按钮组

### NPC Agent

两阶段管线：
1. 确定性规则过滤（src/data/agents/npcDecisionRules.ts）
2. LLM 推理（src/engine/world/npcPromptBuilder.ts，~300 token 紧凑 prompt）

多 NPC 并行决策：worldSimulator.ts 中分三阶段——确定性规则过滤（串行）→ LLM 决策（Promise.all 并行）→ 结果合并（串行）。

三个幕后 Agent（建成/元吉/李渊，src/data/agents/offstageAgents.ts）：纯确定性每日压力贡献，不消耗 LLM token。

> v3.4.4：建成/元吉/李渊已升级为完整 NPC，offstageAgents 暂为空数组，待用户补充其他历史人物。

### 约束中枢

src/data/promptConstraints.ts 是所有 LLM prompt 约束的唯一来源：
- **历史事实层**（HISTORICAL_CONTEXT / NAMING_RULES）：人物表、禁用词、称谓规则，永远不变
- **叙事节奏层**：由 pressure.ts `getNarrativeIntensity()` 动态返回 4 档烈度约束
- `buildConstraintBlock(dateStr, intensityConstraint, detailed?)` 统一拼装，消费方不自己拼字符串
- `detailed=true`（场景对话）注入完整称谓规则，`false`（NPC 决策/事件生成）用紧凑版

### 跨场景记忆

- src/engine/world/memoryExtractor.ts：场景结束后 LLM 提取 NPC 记忆（~200-300 tokens）
- WorldState.characterMemories 持久化，注入 NPC 决策 prompt（最近 5 条）和场景对话 prompt
- 每角色上限 10 条，超出保留最新

### 日常活动

src/engine/world/activities.ts：5 类 12 项活动（治政/军务/情报/社交/个人），每项有压力效果和场景文案（~50 条 flavorText）。活动选择期间后台异步跑 NPC agent LLM 调用，掩盖延迟。

## 关键模块导航

| 要改什么 | 去哪里 |
|---------|--------|
| 压力参数/公式 | src/engine/world/pressure.ts + src/engine/world/worldState.ts（初始值） |
| 事件类型/触发条件 | src/data/skeletons/*.ts |
| NPC 决策规则 | src/data/agents/npcDecisionRules.ts |
| 幕后角色每日效果 | src/data/agents/offstageAgents.ts |
| 日常活动内容/效果 | src/engine/world/activities.ts |
| LLM prompt 约束/称谓/禁用词 | src/data/promptConstraints.ts |
| 场景对话 prompt | src/engine/world/promptBuilder.ts |
| NPC 决策 prompt | src/engine/world/npcPromptBuilder.ts |
| 事件变体生成 prompt | src/engine/world/eventGenerator.ts |
| 跨场景记忆提取 | src/engine/world/memoryExtractor.ts |
| 前端状态机/路由 | src/App.tsx |
| 案台视觉层/光照 | src/components/desk/DeskLayout.tsx |
| 日常活动交互 | src/components/DailyActivityScreen.tsx |
| PixiJS 渲染层 | src/renderer/layers/BackgroundLayer.ts, AtmosphereLayer.ts, DeskContentLayer.ts |
| 存档/读档 | src/engine/world/worldState.ts（localStorage） |
| 角色数据/记忆 | src/data/characters/*.ts + memories/*.md |
| 类型定义 | src/types/index.ts（基础）+ src/types/world.ts（世界模拟） |
| 调试日志 | src/engine/debugLog.ts |
| 自动跑局/评估 | scripts/*.ts |
| 结局判定 | src/engine/world/endingResolver.ts + src/data/endings.ts |
| 快进机制 | src/engine/world/fastForward.ts + worldSimulator.fastForward() |
| Outcome 应用 | src/engine/world/pressure.ts → applyOutcomeEffects() |
| Flag 白名单 | src/data/flags.ts |
| 玩家官职初始数据 | src/data/characters/liShimin.ts → LI_SHIMIN_INITIAL_OFFICES |

## 技术约定

### TypeScript
- tsconfig.app.json 启用了 `noUnusedLocals: true` 和 `noUnusedParameters: true`，未使用的变量/参数会导致构建失败
- 不要用下划线前缀 `_var` 回避——要么用它，要么删它

### Vite 限制
- `import.meta.glob` 只有在 Vite 下才能跑（src/data/characters/memoryLoader.ts 用了它）
- 纯 Node/tsx 环境下无法 import characters 模块，测试时需避开这条依赖链
- vitest 中 `import.meta.env.DEV` 可用（debugLog.ts 用了它）

### LLM 接口
- `LLMProvider.chat(messages: LLMMessage[], onChunk?: (text: string) => void, signal?: AbortSignal): Promise<LLMResponse>`
- 支持 6 家 provider（OpenAI / Anthropic / DeepSeek / Moonshot / 通义千问 / 智谱），全部走 OpenAI 兼容接口或 Anthropic 原生接口

### NPC ID 命名
- 尉迟敬德 = `weichi_jingde`（不是 yuchi）
- 长孙无忌 = `changsun_wuji`
- 房玄龄 = `fang_xuanling`

### 存档
- 自动存档到 localStorage，但 event_scene 模式下**不存**（SceneManager 状态不可序列化）
- worldState.ts 中的 `saveWorldState` / `loadWorldState` / `clearSavedWorldState`
- SAVE_KEY = `'xuanwumen_world_state'`

## 已废弃（保留但不再使用）

- `src/data/timelines/` — v2.0 固定时间线（整个目录）
- `src/data/scenes/*.ts` — v2.0 固定场景（可作为骨架 fallback 变体的参考）
- `src/data/historicalConstraint.ts` — 已合并到 promptConstraints.ts
- `src/components/NarratorPanel.tsx` — 已不再被 GameScene 引用
- `src/components/DialogueFlow.tsx` — 被 DialoguePanel 替代
- `src/components/VisualDemoScreen.tsx` — v3.4.3 视觉已合并到 DailyActivityScreen + DeskLayout，保留作参考
- `src/renderer/DeskDemo.tsx` — v3.4.3 demo 入口已移除
- `src/components/desk/ImperialDesk.tsx` — v3.4.3 被 DeskLayout 替代
- `src/components/desk/ChangAnMap.tsx`（SVG 版）— v3.4.3 被 DeskLayout 中的 ChangAnMap（图片版）替代

## 已删除（v3.4.1 清理）

- `src/engine/campaignManager.ts` — 被 WorldSimulator 替代
- `src/engine/outcomeBuilder.ts` — v2.0 场景结果提取，被 memoryExtractor 替代
- `src/engine/__test__promptBuilder.ts` — 废弃冒烟测试，引用已删除的 data/scenes

## 已知待改进

- ⚠️ autoplay.test.ts 在 vitest Windows 环境下运行不稳定（模块加载竞争），待排查
- 骨架 fallback 变体尚未实现（LLM 生成失败时无兜底）
- LLM 变体生成无重试逻辑
- worldSimulator.ts (755行) 和 activities.ts (783行) 超 arch-guard 300行限制，待拆分
- buildSystemPrompt 函数 ~80 行，超 arch-guard 50行限制
- EventSceneWrapper 的 setTimeout 未在 unmount 时清理
- LLM 等待时间长是最大体验问题，需探索预加载/缓存/prompt 压缩

## v3.4.2 变更摘要

### NPC Stance 精细化（8 → 19）
- 19 个 stance 区分文臣/武将行为模式，5 档 pressure cap
- 三个 NPC 决策规则全面重写（npcDecisionRules.ts），每人 4-5 个紧迫度档位

### Eval 检测强化
- 禁用词 12 → 28，称谓规则 2 → 6，新增虚构事件检测 + 人设一致性检测
- P1/P2 分级输出：P1（历史跳跃/称谓/虚构/人设）优先，P2（重复/记忆）参考
- eval 不再调 LLM，全部纯规则检测

### 自动跑局策略化
- `AUTOPLAY_STRATEGY` / `AUTOPLAY_RPM` 环境变量

### 当前重点
1. **Eval 聚焦幻觉/硬错误**（P1 检测），涌现放 P2 慢慢调
2. **UI 打磨**：提升游戏感
3. **等待时间优化**：LLM 调用延迟

## v3.4.3 变更摘要

### 记忆系统升级
- memoryExtractor 输出结构扩展：除 memories 外新增 `relationshipDeltas`（角色间信任度变化 -10~+10）
- WorldState 新增 `characterLongTermSummary`：短期记忆超 15 条时 LLM 提炼旧记忆为浓缩文本，永久累加
- WorldState 新增 `relationshipOverrides`：`[fromId][toId] = {trustDelta, recentEvents[]}`，运行时与静态 trust 叠加
- `selectMemories()` 工具函数：按 importance 排序 + 最近 N 条保底，避免无差别堆砌记忆
- worldSimulator 新增 `compactMemoriesForCharacter()`：超阈值自动 LLM 摘要 + 按 importance 截断
- worldSimulator 新增 `mergeRelationshipDeltas()`：累计 trust 变化 clamp -60~+60，recentEvents 保留最新 5 条

### 玩家行为日志
- 新增 `PlayerAction` 类型（world.ts）：记录活动选择 / 事件结局 / 按下不表
- WorldState 新增 `playerActionLog`（滑窗 30 条）
- worldState.ts 新增 `appendPlayerAction()` / `getRecentPlayerActions()`
- NPC 决策 prompt 注入"秦王近日行踪"（最近 5 天行为）
- 场景对话 prompt 注入玩家近期行为

### Prompt 增强
- npcPromptBuilder 注入长期记忆摘要 + 态度变化（有效信任度 = 静态 + delta）
- promptBuilder `buildCharacterBlock()` 合并 relationshipOverrides，显示信任度变化和近期原因
- promptBuilder `buildSystemPrompt()` 新增 `relationshipOverrides` / `recentPlayerActions` 参数
- SceneManager 构造函数接收并传递 relationshipOverrides / recentPlayerActions

### 事件生成优化
- eventGenerator 改用 `callLLMWithRetry` + `forbiddenWordsValidator` + `jsonValidator` 结构校验
- worldSimulator 新增事件变体预取：briefing 期间后台启动 `resolveEventInstance`，进入事件场景时直接 await，减少等待

### LLM 接口增强
- LLMMessage 新增 `cacheBoundary?: boolean` 字段
- Anthropic provider 支持 prompt cache：cacheBoundary 位置注入 `cache_control: { type: 'ephemeral' }`，系统 prompt 前缀可被缓存
- memoryExtractor 改用 callLLMWithRetry + validators

### 存档兼容
- restoreGame 兼容旧存档：characterLongTermSummary / relationshipOverrides / playerActionLog 缺失时补空
- Character 类型新增 `longTermSummary?: string`

### 早中晚光照区分（PixiJS 渲染层）
- BackgroundLayer 新增 `setTimeSlot()`：案台场景 overlay 颜色和 vignette 强度按时段变化（晨-冷蓝灰淡 / 午-暖棕中 / 夜-深暗橙浓）
- AtmosphereLayer 新增 `setTimeSlot()`：烛光和光束颜色、位置、亮度按时段区分（晨-光束亮烛光暗 / 午-均衡 / 夜-烛光亮光束消）
- DeskContentLayer TIME_TINTS 差异增大：晨-冷蓝右上光斑 / 午-暖黄正上 / 夜-暖橙左侧高 alpha
- GameCanvas 在 deskState 变化时将 timeSlot 传递给 BackgroundLayer 和 AtmosphereLayer

### Demo 视觉合并到正式游戏
- 新建 `src/components/desk/DeskLayout.tsx`：从 VisualDemoScreen 提取视觉组件（desk.png 背景、VignetteLayer 暗角、CandleGlow 烛光、ChangAnMap 地图+印章、TimeSlotTablet 石碑按钮、PressurePanel 真实压力数据）
- DailyActivityScreen 完全重写 JSX：用 DeskLayout 做外层容器，左侧活动面板改为深色卡片式布局（按 category 分组），中央叠加地图 + DeskObject，底部石碑风格时段按钮
- TIME_LIGHTING 三时段光照配置（morning/afternoon/evening）驱动 CSS 层暗角、烛光、色调叠加

### Demo 入口清理
- main.tsx 移除 VisualDemoScreen 和 DeskDemo 分支，所有 URL 统一走 App
- VisualDemoScreen.tsx、DeskDemo.tsx、ImperialDesk.tsx、ChangAnMap.tsx（SVG 版）标记为废弃

## v3.4.4 变更摘要

### 三 NPC 升级（建成 / 元吉 / 李渊 → 完整 NPC）
- 三人原为 offstageAgents（确定性每日压力贡献），现升级为完整 NPC，纳入与秦王府三人同等的决策与对话系统
- 每日 LLM 决策与现有 NPC 并行（worldSimulator.ts Promise.all），可在事件场景中作为 activeNpcIds 出场对话
- offstageAgents.ts 改为空数组，文件保留作占位，等待补充秦叔宝 / 程咬金 / 魏征等历史人物作为新的背景压力贡献者

### 新建数据
- src/data/characters/{liJianCheng,liYuanJi,liYuan}.ts — 三人 Character 骨架（Big Five / speechStyle / relationships / goals）
- src/data/characters/memories/{li_jiancheng,li_yuanji,li_yuan}/foundational.md — 各 6 条历史基线记忆
- li_yuanji 的 internalConflict 显式刻画"表面助大哥实则二虎相争"动机
- li_yuan 的 longTerm 显式刻画"挑动诸子相争以坐稳帝位"的帝王心术

### NPC 决策规则
- npcDecisionRules.ts 新增 NPC_IMPACT_PROFILES / NPC_PATIENCE_DECAY / 三套规则
- 李建成：daily / active (jiancheng_hostility ≥50) / aggressive (succession_crisis ≥60) / decisive (succession_crisis ≥80, 含 assassinate)
- 李元吉：daily / active / aggressive / assassin / **fishing**（jiancheng_hostility ≥70 且 qinwangfu_desperation ≥60 时启动二虎相争算计）
- 李渊：daily / balance / suspicious / imperial / **balance_act**（双方压力都高时挑动较弱方打破独大）

### prompt 适配
- promptConstraints.ts 紧凑版称谓规则补齐：建成称世民"二郎/秦王"、元吉称"二哥/秦王"，明确禁用"殿下"
- 现有 buildNpcDecisionPrompt / buildSystemPrompt 通用，三人自动复用

### 结局系统重写（5 结局光谱 + 资产剥夺）
- 5 结局锁定（保留原 EndingType 字面量，不重命名）：E1 玄武门成功 / E3 惨胜（武力胜但失盟友）/ F1 政治终局失败 / F5 武力发动失败 / N1 时光流逝
- 新类型 `OutcomeEffect`（discriminated union）：pressure / loseNpc / injureNpc / loseOffice / confiscateMilitary / flag。原 `PressureModifier` 保留不动（NpcAction.pressureEffects 等几十处使用兼容）
- `NpcAgentState` 新增 status: 'active' | 'exiled' | 'imprisoned' | 'deceased' | 'dispatched' + statusSince/statusReason
- `WorldState.playerOffices: PlayerOffice[]` —— 5 官职常量在 liShimin.ts 末尾导出 LI_SHIMIN_INITIAL_OFFICES，被 createInitialWorldState 注入
- `loseOffice` 通过 PlayerOffice.militaryCeilingContribution 反向改写 pressureAxes.military_readiness.ceiling（复用既有 ceiling 字段，无需新结构）
- `src/data/flags.ts`（新建）：FlagKey 白名单 + isValidFlagKey() 校验，applyOutcomeEffects 在 flag 分支强制校验
- `src/data/endings.ts`（新建）：EndingType → {code 'E1'/.../, name, description} 映射，UI 与 evalPlaythrough 消费
- `src/engine/world/pressure.ts` 新增 `applyOutcomeEffects(state, effects)`：单一入口 switch 五种 kind，pressure 分支复用既有 applyPressureModifiers；新增 `extractPressureModifiers()` 从 outcomes 中过滤 pressure-kind 修正，保持 eventLog.pressureEffects 字段向后兼容
- `src/engine/world/endingResolver.ts`（新建）：resolveEnding(state) 返回 EndingDecision { ending, reason, evidence }，优先级链 F5 → E3 → E1 → F1 → 第 180 天 N1。**直接替换** worldSimulator.checkGameOver
- NPC active 过滤的唯一真相源：runWorldTick 决策阶段、startEventPrefetchIfPending 的 npcIds 收集都在 worldSimulator 层一次过滤；sceneManager 不重复过滤
- 存档迁移：worldState.ts 的 migrateWorldState 自动补 npcAgents[].status='active' / playerOffices=LI_SHIMIN_INITIAL_OFFICES，旧档 outcomeEffects 旧 PressureModifier[] 透明 wrap 为 [{kind:'pressure',modifier}]

### 事件骨架结构化 + 改造 8 + 新增 3
- `SceneResolution.resolutionSignals` 改为 `ResolutionSignal[] = { outcome: 'success' | 'partial' | 'failure' | 'disaster', description }`（原是 string[]）
- `EventSkeleton.baseOutcomeEffects` 升级为 `TaggedOutcomeEffect[] = OutcomeEffect & { id, tag }`
- LLM 在场景结束 JSON 返回 `chosenOutcome: ResolutionTag`（枚举单选，比 id 列表稳健）。worldSimulator.handleEventEnd(summary, chosenOutcome) 据此从 currentEventInstance.outcomeEffects 筛 tag === chosenOutcome 的全部生效。LLM 不返回 → 兜底 'success'
- 改造现有 8 骨架（src/data/skeletons/*.ts）：banquetCrisis / politicalConfrontation / assassinationCrisis / subordinateUltimatum / imperialSummons / intelligenceEvent / allyWavering / militaryConflict 全部加 failure/disaster outcome 候选
- 新增 3 骨架：
  - **courtImpeachment**（朝堂构陷罢黜）：jiancheng_hostility ≥60 + court_opinion ≥50。failure→loseOffice(tiance_shangjiang)；disaster→loseOffice(shangshu_ling)+loseOffice(yongzhou_mu)+flag impeached_severely
  - **courtCounterstrike**（朝堂主动反击）：precondition flag impeached_severely + qinwangfu_desperation ≥55。success→injureNpc(li_jiancheng, commitment-20)；disaster→loseNpc(fang_xuanling, imprisoned)
  - **seizeMilitaryCommand**（夺兵权请缨）：flag tujue_invasion + yuanji_ambition ≥60。failure→confiscateMilitary(-30)+flag military_stripped；disaster→上述 + loseOffice(zuo_wuwei_dajiangjun)
- npcPromptBuilder.ts：buildEventGenerationPrompt 接收 ResolutionSignal[] 按 outcome tag 分组渲染；末尾追加 chosenOutcome 枚举提示

### 时间窗 flag 触发器
- `tujue_invasion` 由 worldSimulator.runWorldTick 在 `isAfterDate(cal, 3, 15)` 后种入（约第 70 天，对应武德九年三月中），仅触发一次
- 后续可扩展为独立的"突厥"幕后 agent，目前先用最小成本接入以解锁 seizeMilitaryCommand 骨架的 precondition

### 快进机制
- `src/engine/world/fastForward.ts`（新建）：planFastForward(state, requestedDays) 纯只读判定。当前判定 pendingEvents 非空 / 已到 180 天兜底；其他动态信号（NPC patience / 压力外推）由 fastForward 每日重 plan
- `WorldSimulator.fastForward(maxDays)`：循环 endDay() + proceedFromBriefing()，**每天重 plan**（NPC 决策可能改 velocity，初始预测不可信）。任一停止信号或 mode 切换为 event_scene/game_over 立刻退出，返回 { daysAdvanced, stopReason }
- DailyActivityScreen 在结束今日按钮旁加 [快进 3 日] [快进 7 日] 按钮组，期间显示骨架 loading（"推演中……正在快进 X 天"）

### 影响
- 每日 LLM 调用从 3 次增至 6 次（Promise.all 并行，付费档延迟 +30-50%；免费档因 RPM 限制可能 3-4×）
- prompt token 增加，建议保持 v3.4.3 的 Anthropic prompt cache 启用
- 302 单测全过（含 11 骨架结构断言、outcome 应用、endingResolver 优先级回归）

