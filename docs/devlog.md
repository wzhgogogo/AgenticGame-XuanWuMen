# 开发日志（DEVLOG）

> 记录每天改了什么、为什么改。面向"过去的自己和协作者"，重点是动机和取舍，不复述代码细节。
>
> 约定：按日期倒序，每条改动单独起一段，写「为什么」和「影响」。
> 标签：`[fix]` 代码修复 / `[eval]` eval 相关发现与改动 / `[test-bug]` 测试踩坑

---

## 2026-04-29

### 整体 Review 修复：平衡调参 + 代码质量

**为什么**：对 v3.4.5 做全面 review，发现若干逻辑/平衡问题和代码质量问题。

**改动**：
- `has_recent_intel` / `palace_insider_contacted` 加入 FlagKey 白名单（原来活动 flag 效果静默无效）
- 尉迟 patience 衰减 2.0 → 1.5（原来 50 天归零后行为永久单调）
- 宴会危局 maxOccurrences 2 → 1（被阴一次不会再赴宴，刺杀保留多次）
- allyWavering failure 目标从 fang_xuanling 改为 changsun_wuji（分散两个 outcome 的打击对象）
- EndingScreen 按钮样式提取为 EndingButton 组件（去重 60 行）
- ISceneManager.setLogger 参数从 `unknown` 改为正确的 `GameLogger` 类型
- GameLogger 移除每次 log/logLLMCall 的 localStorage 写入，改为仅在 save() 时持久化

**影响**：tsc ✅ / 320 单测全过 / 构建通过。平衡效果需下次 autoplay 验证。

### [eval] Eval 增强：游戏体验指标 v2

**为什么**：P1 问题已归零，eval 重心转向游戏体验。最近跑局暴露 chosenOutcome 100% success、NPC 行为多样性低、骨架覆盖率不足。

**改动**：evalPlaythrough.ts 新增 Part 5 游戏体验指标，包含 6 个模块——Outcome 分布（按骨架分组）、压力轴趋势（每日 delta / spike / 撞顶归零检测）、结局路径分析（距 5 结局各多远）、NPC 存活状态追踪、骨架覆盖率（X/11）、场景对话回应度。eval skill 同步更新。

**待观察**：
- 尉迟 1.5 衰减是否让 `wcj_aggressive` / `wcj_impatient` 规则在合理时间窗触发（预期 ~47 天 patience < 30）
- 宴会限 1 次后叙事节奏是否依然有足够的"被动危机"事件
- 100% success outcome 问题需检查 resolutionSignals 引导，可能需在 prompt 端加强 failure/disaster 引导

---

## 2026-04-28

### NPC 涌现优化：alertness 接入决策 + 敌方 NPC 锁定出场

**为什么**：autoplay 分析发现两个涌现问题——(1) 事件后 NPC 行为不变（"沉默→沉默"），因为 `alertness` 字段被 handleEventEnd 写入但决策规则从不读取，压力变化（5-18点）也不够跨越规则阈值（50-80）；(2) 敌方 NPC 几乎不出场，因为 `activeNpcIds` 完全由 LLM 选择，大多数骨架 `requiredRoles` 描述己方角色。

**改动**：
- `NpcDecisionRule.conditions` 新增 `alertnessAbove/Below`，`matchConditions` 加 2 行 guard
- 6 个 NPC 各加一条 `alertnessAbove: 30` 规则，事件后解锁更积极的 stance（谋士→情报反应，武将→巡防，太子→监控，元吉→施压，皇帝→平衡）
- `handleEventEnd` 新增 alertness 广播：failure/disaster 非参与者 +5，含阵亡/被擒则 +10
- NPC 决策 prompt 显示警觉值
- `EventSkeleton` 新增 `requiredNpcIds?: string[]`，eventGenerator 合并锁定 NPC 与 LLM 选择
- 6 个骨架硬绑定敌方 NPC：暗杀/军事冲突锁建成+元吉，宴会/弹劾锁建成，御前召见锁李渊，夺兵权锁元吉

**影响**：事件后 NPC 应当在 1-3 次事件后（alertness 累积 ≥30）解锁新 stance，不再停留在 observe。敌方 NPC 在对应事件中必定出场。320 测试全过。

### [test-bug] v3.4.5 单测：320 用例 + alertness/requiredNpcIds 新增 18

```
 Test Files  15 passed (15)
      Tests  320 passed (320)
   Duration  22.28s

 tsc -b  通过（仅 DeskLayout 预存错误）
```

新增/修改的测试：

| 文件 | 改动 | 新增用例数 |
|------|------|-----------|
| `src/engine/world/__tests__/npcAgent.test.ts` | alertnessAbove/Below 条件匹配 4 个用例 | +4 (23→27) |
| `src/data/skeletons/skeletons.test.ts` | requiredNpcIds 校验（11 骨架结构 + 3 骨架锁定断言） | +14 (98→112) |

**alertness 条件（npcAgent.test.ts）：**
- `alertnessAbove: 30` 命中（alertness=40）→ 解锁 stance
- `alertnessAbove: 30` 不命中（alertness=20）→ fallback observe
- `alertnessBelow: 30` 命中（alertness=10）→ 解锁 stance
- `alertnessBelow: 30` 不命中（alertness=30）→ fallback observe

**requiredNpcIds（skeletons.test.ts）：**
- 11 骨架结构校验：requiredNpcIds（如有）中每个 ID 必须是 6 个合法 NPC ID 之一
- assassinationCrisis 锁定 `['li_jiancheng', 'li_yuanji']`
- imperialSummons 锁定 `['li_yuan']`
- militaryConflict 锁定 `['li_jiancheng', 'li_yuanji']`

本次改动纯粹扩展（新增条件类型 + 可选字段），未触发任何已有测试回归。

---

## 2026-04-27

### Eval 检测规则修复
**为什么**：跑 autoplay eval 后发现 P1 称谓错误全是误报——"陛下"指李渊是合法的，eval 把所有出现"陛下/圣上"的地方都标了；"杀兄"在角色讨论道德困境时是合理对话，不算历史跳跃。
**改动**：
- `stripThinking` 增加 `<think>` 标签支持（Gemma 4 格式）
- 删掉"NPC名字+陛下/圣上"的粗暴匹配，改为只检测明确混用（"秦王陛下"）
- "父皇/大哥/四弟"收紧为只检测 NPC 直接对话（"X道：……父皇"），排除玩家视角
- 禁用词精细化："杀兄"→"杀兄夺位"，"弑兄"移除
**影响**：P1 从 5 处降到 0 处，消除全部误报。

### 骨架 outcome 重整 + 结局兜底
**为什么**：autoplay 跑出"秦王在昆明池被伏兵围困""宴会上被擒"等叙事上极其严重的结局，但游戏若无其事继续——根因是 disaster outcome 只设 flag/压力，endingResolver 不检查这些 flag，也缺少 loseNpc 等重后果。多个骨架的 disaster 比 failure 还轻（暗杀 failure 丢尉迟，disaster 只有一个 flag）。
**改动**：
- 新增 `player_captured` flag，endingResolver 最高优先级检查 → 政治终局
- endingResolver 同时检查 `commitment_collapse`、`dispatch_to_luoyang` → 政治终局；`shimin_injured` + 丢≥1官 → 政治终局
- `applyOutcomeEffects` 加动态 NPC 替补：loseNpc/injureNpc 目标已非 active 时从秦王府三人池选替补，绝不选李渊/建成/元吉
- 6 个骨架 disaster/failure 加重：暗杀(player_captured+长孙imprisoned)、宴会(新增partial+failure改尉迟战死+disaster改player_captured)、逼宫(加房玄龄exiled)、军事冲突(failure加尉迟阵亡+兵权-30/disaster加player_captured)、盟友动摇(新增disaster)、政治对峙(disaster加丢两官)
**影响**：叙事严重度与机械后果对齐，disaster 不再是空 flag。302 测试全过。

### Autoplay 改进
**为什么**：免费 API RPM 限制导致 1 小时只跑到 Day 22，vitest 3600s 超时退出；LLM 返回 429 时无重试直接失败。
**改动**：`rateLimitedProvider` 加 429 指数退避重试（最多 5 次）；timeout 3600s → 7200s。

### [test-bug] v3.4.4 全量单测 302 + 冒烟测试 + 冒烟脚本修复

```
 Test Files  15 passed (15)
      Tests  302 passed (302)
   Duration  24.20s

 tsc -b  通过（0 errors）
```

新增 4 个测试文件（v3.4.3-v3.4.4 期间）：

| 文件 | 被测模块 | 用例数 |
|------|----------|--------|
| `src/engine/world/__tests__/playerActionLog.test.ts` | 玩家行为日志 | 7 |
| `src/engine/llm/__tests__/anthropic.test.ts` | Anthropic prompt caching | 5 |
| `src/engine/llm/__tests__/retry.test.ts` | callLLMWithRetry 重试/退避 | 9 |
| `src/engine/llm/__tests__/validators.test.ts` | LLM 输出 validator | 15 |

骨架测试从 77 → 98 用例（3 新骨架 courtImpeachment/courtCounterstrike/seizeMilitaryCommand + TaggedOutcomeEffect 结构断言）。

#### 冒烟测试

首次运行 2/4 失败，修复后 4/4 通过。

| 测试 | 耗时 | 结果 |
|------|------|------|
| LLM 基础连通（streaming chat） | 9.3s | PASS |
| NPC 决策（长孙无忌 scheme） | 33.5s | PASS（修复后） |
| 事件变体生成（情报骨架） | 48.2s | PASS |
| 记忆提取（memoryExtractor） | 19.6s | PASS（修复后） |

#### [test-bug] 坑 1: NpcAgentState 缺 status 字段

**现象**: Test 2（NPC 决策）报 `Cannot read properties of undefined (reading 'name')`
**根因**: v3.4.4 新增 `NpcAgentState.status` 字段，冒烟脚本手工构造的 agentState 缺少该字段。同时 stances 数组使用了旧值 `intel`/`persuade`（v3.4.2 已废弃），`STANCE_GUIDE[stance]` 返回 undefined 导致 `.name` 访问崩溃。
**修复**: 补 `status: 'active', statusSince: 1`；stances 改为 `['observe', 'analyze', 'advise', 'scheme']`。
**防复发**: test skill 坑 #8 已记录此类问题。

#### [test-bug] 坑 2: extractSceneMemories 返回结构变更

**现象**: Test 4（记忆提取）报 `memories is not iterable`
**根因**: v3.4.3 将返回类型从 `Record<string, MemoryEntry[]>` 改为 `SceneExtractionResult { memories, relationshipDeltas }`。冒烟脚本直接遍历 result 而非 result.memories。
**修复**: 改为 `result.memories` 访问。

---

## 2026-04-26

### 三 NPC 升级：建成 / 元吉 / 李渊 → 完整 NPC
**为什么**：原三人作为 offstageAgents 仅贡献确定性每日压力，但骨架 banquetCrisis / imperialSummons / assassinationCrisis 的 constraints 文本一直要求他们出场——LLM 根本拿不到他们的 character profile，availableNpcIds 过滤后只剩秦王府三人，事件场景的"对手戏"只能让长孙/敬德/玄龄自言自语。要让世界真正动起来，必须把他们做成完整 NPC。
**影响**：
- 新建 6 个角色文件：`liJianCheng.ts` / `liYuanJi.ts` / `liYuan.ts` + 各自 foundational.md（每人 6 条历史基线记忆）。
- Big Five 与 speechStyle 按历史人格刻画：建成（O60/C70/E75/A50/N65，自称"孤"）、元吉（O40/C35/E70/A25/N80，自称"孤"）、李渊（O65/C60/E65/A60/N70，自称"朕"）。
- 关键人格设计：元吉 internalConflict 显式刻画"表面助大哥实则二虎相争"——盼建成与世民两败俱伤后自己上位；李渊 longTerm 显式刻画"挑动诸子相争以坐稳帝位"的帝王心术——任何一方独大都要立刻打压。
- 决策规则按性格定档：建成 4 档（lobby → scheme → assassinate）；元吉 5 档新增 **lyj_fishing**（jiancheng_hostility ≥70 且 qinwangfu_desperation ≥60 时启动二虎相争算计）；李渊 5 档新增 **lyy_balance_act**（双方压力都高时挑动较弱方维持三角）。
- 耐心衰减速率体现性格：建成 0.4（持续推进有政治理性）/ 元吉 1.5（急躁好战）/ 李渊 0.2（皇帝最稳）。
- offstageAgents.ts 改为空数组，文件保留作占位，等待用户后续补充秦叔宝 / 程咬金 / 魏征等历史人物作为新的背景压力贡献者。
- promptConstraints.ts 紧凑版称谓规则补齐：建成称世民"二郎/秦王"、元吉称"二哥/秦王"，明确禁用"殿下"——避免 NPC 决策 prompt 让敌对方误用下属敬语。

### 综合影响
- 281 单测全过，tsc 通过。
- 每日 LLM 调用从 3 次升到 6 次（Promise.all 并行），付费档延迟 +30-50%，免费档因 RPM 限制可能 3-4×。
- prompt token 上涨明显，需依赖 v3.4.3 已落地的 Anthropic prompt cache 缓解。
- 早中期节奏可能因 LLM 决策的"温和倾向"变慢，等实玩 1-2 局后回调 baseline patience 与决策阈值。
- 后续可在 banquetCrisis / imperialSummons 等场景里实测三人是否按期出场对话。

### 结局系统重写：5 结局光谱 + 资产剥夺（同日续作）
**为什么**：v3.4.3 落地后跑了几局发现根本"输不了"——所有事件 outcome 只改压力轴数值，永远不会失去 NPC、官职、兵权；resolutionSignals 全是中性偏正面；180 天到了基本就是赢。同时现有 checkGameOver 5 个 ending 与玩家心智里的"路径与代价"对不上：`coup_fail_civil_war_win` 语义模糊，`peace` 几乎不可触发。要让游戏成为第一个可玩版本，必须把"代价"和"结局光谱"一次性做出来。

**5 结局锁定**（保留原 EndingType 字面量，避免重命名牵连 LLM prompt / UI / autoplay）：
- E1 玄武门成功 `coup_success` / E3 惨胜 `coup_fail_civil_war_win` / F1 政治终局失败 `deposed` / F5 武力发动失败 `coup_fail_captured` / N1 时光流逝 `peace`
- 优先级链 F5 → E3 → E1 → F1 → 第 180 天 N1，在 `endingResolver.ts` 中判定，**直接替换** 旧 checkGameOver

**OutcomeEffect discriminated union**（types/world.ts）：pressure / loseNpc / injureNpc / loseOffice / confiscateMilitary / flag。原 `PressureModifier` 保留不动以兼容 NpcAction.pressureEffects 等几十处使用。`applyOutcomeEffects` 单一入口在 pressure.ts 中 switch 五种 kind，pressure 分支复用既有 applyPressureModifiers。
**NpcAgentState.status**：active / exiled / imprisoned / deceased / dispatched + statusSince/statusReason。worldSimulator 在 runWorldTick 决策阶段、startEventPrefetchIfPending 的 npcIds 收集都在 worldSimulator 层一次过滤，sceneManager 不重复过滤——单一真相源。
**WorldState.playerOffices**：5 官职常量在 liShimin.ts 末尾导出 LI_SHIMIN_INITIAL_OFFICES，被 createInitialWorldState 注入。loseOffice 通过 PlayerOffice.militaryCeilingContribution 反向改写 pressureAxes.military_readiness.ceiling（复用既有 ceiling 字段，无需新结构）。
**FlagKey 白名单**（src/data/flags.ts）：所有 flag-kind outcome 必须使用枚举内的 key，applyOutcomeEffects 在 flag 分支强制校验。
**存档迁移**：worldState.ts 的 migrateWorldState 自动补 npcAgents[].status='active' / playerOffices=LI_SHIMIN_INITIAL_OFFICES，旧档 outcomeEffects 旧 PressureModifier[] 透明 wrap 为 [{kind:'pressure',modifier}]。
**eventLog 兼容**：handleEventEnd 用新增 `extractPressureModifiers()` 从 outcomes 中过滤 pressure-kind 修正，保持 eventLog.pressureEffects 字段为 PressureModifier[]——evalPlaythrough/调试面板不破。

### 事件骨架结构化 + 改造 8 + 新增 3
**为什么**：旧 `baseOutcomeEffects: PressureModifier[]` 只能改压力数值，且无 outcome 分支——LLM 无论场景演成什么，都只能套同一组效果。要让"输得起"成立，骨架必须支持 success/partial/failure/disaster 多分支，由 LLM 在场景结束时选定。

- `SceneResolution.resolutionSignals` 改为 `ResolutionSignal[] = { outcome: ResolutionTag, description }`（旧是 string[]）
- `EventSkeleton.baseOutcomeEffects` 升级为 `TaggedOutcomeEffect[] = OutcomeEffect & { id, tag }`
- LLM 在场景结束 JSON 返回 `chosenOutcome: ResolutionTag`（枚举单选，比 id 列表稳健）。worldSimulator.handleEventEnd(summary, chosenOutcome) 据此从 currentEventInstance.outcomeEffects 筛 `tag === chosenOutcome` 全部生效。LLM 不返回 → 兜底 `success`
- 改造现有 8 骨架：banquetCrisis / politicalConfrontation / assassinationCrisis / subordinateUltimatum / imperialSummons / intelligenceEvent / allyWavering / militaryConflict 全部加 failure/disaster outcome 候选（如 subordinate failure → loseNpc(weichi_jingde, exiled) + flag commitment_collapse；imperial failure → loseOffice(shangshu_ling) + flag dispatch_to_luoyang）
- 新增 3 骨架（src/data/skeletons/）：
  - **courtImpeachment**（朝堂构陷罢黜）：jiancheng_hostility ≥60 + court_opinion ≥50。failure → loseOffice(tiance_shangjiang)；disaster → loseOffice(shangshu_ling) + loseOffice(yongzhou_mu) + flag impeached_severely
  - **courtCounterstrike**（朝堂主动反击）：precondition flag impeached_severely + qinwangfu_desperation ≥55。三路反击（正面 / 外援 / 后宫）选一；success → injureNpc(li_jiancheng, commitment-20)；disaster → loseNpc(fang_xuanling, imprisoned)
  - **seizeMilitaryCommand**（夺兵权请缨）：flag tujue_invasion + yuanji_ambition ≥60。元吉奏请代秦王北征欲调走精兵；failure → confiscateMilitary(-30) + flag military_stripped；disaster → 上述 + loseOffice(zuo_wuwei_dajiangjun)
- npcPromptBuilder.ts：buildEventGenerationPrompt 接收 ResolutionSignal[] 按 outcome tag 分组渲染；末尾追加 chosenOutcome 枚举提示

### 时间窗 flag 触发器
worldSimulator.runWorldTick 在 `isAfterDate(cal, 3, 15)` 后种入 `tujue_invasion` flag（约第 70 天，对应武德九年三月中），仅触发一次——作为 seizeMilitaryCommand 的 precondition 解锁条件。后续可扩展为独立的"突厥"幕后 agent，目前先用最小成本接入。

### 快进机制
**为什么**：1 天 1 个回合 × 180 天 = 180 次点击，事件 cooldown 普遍 10-30 天，中间日报循环让玩家厌倦。但日级精度不能丢（玄武门凌晨发动等场景需要）。给玩家"跳过无事件日子"的开关。

- `src/engine/world/fastForward.ts` 提供纯只读 `planFastForward(state, requestedDays)`：判定 pendingEvents 非空 / 第 180 天兜底；其他动态信号（NPC patience / 压力外推）由 fastForward 每日重 plan
- `WorldSimulator.fastForward(maxDays)` 循环 endDay() + proceedFromBriefing()，**每天重 plan**（NPC 决策可能改 velocity，初始预测不可信）。任一停止信号或 mode 切换为 event_scene/game_over 立刻退出，返回 { daysAdvanced, stopReason }
- DailyActivityScreen 在结束今日按钮旁加 [快进 3 日] [快进 7 日] 按钮组，期间显示骨架 loading（"推演中……正在快进 X 天"）
- 不放在日报屏（语境不对）

### v3.4.4 综合影响
- 302 单测全过，tsc 通过
- 玩家终于"输得起"——事件 outcome 可真正剥夺 NPC、官职、兵权，5 结局光谱清晰
- 事件骨架从 8 增至 11，每条支持 4 档 outcome，LLM 选定即生效
- 快进机制大幅减少无事件日子的点击疲劳，遇事件自动停下
- 后续：autoplay 跑 5+ 局验证 5 结局都至少触达一次；如某结局长期不触发则回头调阈值；新骨架的 chosenOutcome 分布需观察是否过度倾向 failure（信号词更"戏剧"）

---

## 2026-04-24

### callLLMWithRetry 统一重试封装
**为什么**：memoryExtractor / eventGenerator 各自手写"失败重试一次"，分散且不一致；5xx、429、网络错和 validator 失败没区分。想把 LLM 可靠性做成基础设施，后续所有调用都建立在上面。
**影响**：接入 memoryExtractor + eventGenerator；指数退避 1→2→4…→30s，区分可重试/不可重试错误。后续骨架 fallback、agent 扩充、prompt 压缩不用各自写容错。

### 输出 validator（forbiddenWords / json / combine）
**为什么**：运行时需要挡住硬错误——穿越词、后世称号、JSON 格式崩坏——而不是等到 eval 阶段。和 retry 搭配，validator 失败直接触发重试。
**影响**：运行时只做硬错误检测。称谓/人设这类软错误误报率太高，继续留给 eval 后验。

### Anthropic prompt caching
**为什么**：同场景多轮对话 system 前缀每次一模一样，重复计费浪费。Anthropic 支持 `cache_control: ephemeral`。
**影响**：LLMMessage 新增 `cacheBoundary`；anthropic.ts 按边界切分缓存块。场景 system prompt 标为缓存边界，同场景后续轮次输入 token 约节省 80%。其他 provider 忽略此字段。

### 记忆系统升级（top-k + 长期摘要 + 关系 delta）
**为什么**：短期记忆无差别堆砌，超过 10 条就淹没信号；关系变化没有结构化承载，NPC 对玩家态度演化全靠静态 trust。
**影响**：`selectMemories` 按 importance + 最新保底；超 15 条 LLM 提炼为 `characterLongTermSummary`；`relationshipOverrides` 运行时 delta 与静态 trust 叠加；memoryExtractor 同时产出 `relationshipDeltas`。

### 事件变体预取
**为什么**：日报 → 事件场景之间玩家干等一次 LLM 调用，这段时间其实可以和读日报并行。
**影响**：tick 发现 pendingEvent 时后台 kick `resolveEventInstance`，enterEvent 直接 await。乐观情况下省 10-20s 等待。

### 玩家行为日志 playerActionLog
**为什么**：NPC 不知道秦王最近在干嘛（批阅/练兵/密会），决策只能靠压力数值猜，行为和玩家操作脱节。
**影响**：滑窗 30 条，applyActivity / handleEventEnd 写入；NPC 决策 prompt 注入近 5 天，场景 system prompt 注入近 7 天。autoplay 自动带出供 eval 消费。

### 综合影响
- 测试 254 → 281，build 绿，lint 无新增。
- system prompt 长度上升，待 prompt 审计量化。
- autoplay 遇连续 HTTP 500 时 SceneManager 无熔断——记 TODO。

---

## 2026-04-22 · v3.4.2

### [eval] Eval 检测强化 + Stance 精细化

#### 发现

对 `20260422-143243-suppress_jiancheng-autoplay.json` 跑 eval，发现 **17 条 P1 称谓违规**：NPC 对李世民使用"陛下""圣上"等帝王称谓。这是当前最突出的 LLM 幻觉问题——NPC prompt 中有称谓约束但 LLM 遵从度不够。

涌现指标方面，旧的 8 stance 系统下 NPC 行为多样性偏低（尉迟连续 14 天 gather_intel），确认 stance 粒度不足是根因。

#### Eval 检测强化（evalPlaythrough.ts）

- 禁用词 12 → 28（补充继位/登极/新君/践祚/凌烟阁/贞观之治/杀兄/杀弟/鸩酒/兵变成功/夺位等变体）
- 称谓规则 2 → 6（新增：NPC 直呼李世民、李渊姓名检测、后世称谓检测）
- 新增虚构事件检测（fabricated_event）：4 条引用性模式与 eventLog 交叉校验
- 新增人设一致性检测（persona_violation）：文臣反暴烈词、武将反谨慎词
- 输出改为 P1/P2 分级：P1（历史跳跃/称谓/虚构/人设）优先展示，P2（重复/记忆）作参考

#### NPC Stance 精细化（8 → 19）

- 拆分为情报类（4）、文臣类（6）、武将类（7）、极端类（2），详见 README v3.4.2
- 5 档 pressure cap（极端 ±8，观望 ±3）
- 三个 NPC 决策规则全面重写，各 4-5 个紧迫度档位

#### 优先级调整

**Eval 重心从涌现质量转向幻觉/硬错误检测。** 原因：涌现是无底洞，且会随 NPC 和事件骨架增加自然改善；幻觉/错误是硬伤，直接破坏玩家体验。后续 eval 以 P1 检测为主，涌现指标慢慢调。

#### 待观察
- 19 stance 系统下 NPC 行为多样性是否改善（需重新跑局验证）
- 称谓违规是否需要在 prompt 端加强约束（eval 检测到了但修复在 prompt 侧）
- 虚构事件和人设检测的误报率

### 自动跑局策略化
**为什么**：只跑随机策略无法针对性复现问题。
**影响**：`AUTOPLAY_STRATEGY` / `AUTOPLAY_RPM` 环境变量，支持 suppress_emperor / suppress_jiancheng / military_prep 等策略切换。

---

## 2026-04-20 · v3.4.1

### [eval] 第一次系统化 eval

**来源日志**：[logs/20260420-132745-autoplay.json](../scripts/logs/20260420-132745-autoplay.json)
**评估结果**：[logs/20260420-132745-autoplay.eval.json](../scripts/logs/20260420-132745-autoplay.eval.json)
**综合评分**：2.5/5（LLM-as-Judge）

#### 量化信号

- 15 天 × 2 次事件触发（间隔 9 天，偏稀）
- 军事准备 +41 一骑绝尘，其他轴涨幅 3-18
- 尉迟敬德 14 次决策全是 `gather_intel`，零 confront / warn
- 长孙 gather_intel×4 + seek_allies×3，房玄龄 scheme×4 + seek_allies×3 + gather_intel×2

#### Judge 抱怨

1. **角色一致性 3/5**：尉迟人设"刚猛激进"被抹平为情报员
2. **节奏合理性 2/5**：15 天决策序列陷入"察看动向→确认嫌隙→摸清底细"的重复循环
3. **压力叙事弧 3/5**：military +41 与 NPC 行为脱节（都在搜情报，军备却暴涨）
4. **涌现质量 2/5**：NPC 决策高度模板化，"涌现"停留在词汇替换层

#### 根因定位

**问题 ②（决策循环）的根因**：[npcDecisionRules.ts](../src/data/agents/npcDecisionRules.ts) 的 `enabledActions` 动作池过窄——
- 尉迟中段（patience 30-60）`enabledActions` 只给 `['gather_intel']` 一个选项
- 跳到激进档需 `qinwangfu_desperation > 50`，本局 desperation 仅 25→31，门槛够不着
- 结果：LLM 无得可选，只能反复输出 gather_intel

**问题 ③（行为/压力脱节）的根因**：`actionType` 一字段扛三职（LLM 选项 / 语义标签 / 压力 delta 钩子）——
- 尉迟规则把"练兵 military +2"的效果钉在了 `gather_intel` 这个 actionType 上（`reason: '敬德加紧练兵'` 但 actionType 仍叫 gather_intel）
- military +41 ≈ 尉迟 14×2 + 长孙/房玄龄在 succession>55 时各 +1 ≈ 40+，精准对上
- 日志/prompt 只看 actionType 就产生"搜情报怎么军备涨这么多"的割裂感

两问题同一坏味道：**规则把"枚举动作"当作唯一接口**，窄+错位。

#### 改造方案：意图与动作解耦（方案②）

**核心思路**：规则只定"立场大类"（stance），LLM 自由产出具体 action 文本 + 压力 delta 提议。

##### A. Stance 8 分类

| Stance | 含义 | 典型外化 |
|---|---|---|
| observe | 观望 | 听朝议、按兵不动 |
| intel | 情报 | 探亲信、布暗桩 |
| persuade | 温和施压 | 上书、夜谈、劝谏 |
| scheme | 暗中谋划 | 串联、立誓 |
| confront | 当面对抗 | 闯府、质问 |
| mobilize | 动员武力 | 练兵、点将、藏甲 |
| breakdown | 失控 | 越级调兵、逼宫秦王 |
| abandon | 出走/被收买 | 挂冠、投敌、私通东宫 |

##### B. 规则层降格为 stance gate

- `NpcDecisionRule.enabledActions` → `allowedStances: NpcStance[]`
- 每档 3-5 个 stance（不再是 1 个），LLM 真正有得选
- 删除 `basePressureEffects`（让 LLM 提议数值）
- breakdown / abandon 档位加 `once: true`，触发后该规则永久失效
- 每 NPC 配 `impactWhitelist`：能推的压力轴白名单

##### C. LLM 输出 NpcIntent（新结构）

```ts
{
  stance: NpcStance,          // 必须 ∈ 允许清单
  action: string,             // LLM 自由命名，如"夜访萧瑀议储位"
  target?: string,
  description: string,        // ≤30 字，日报用
  pressureDeltas: Array<{axisId, delta, reason}>,
  triggerEvent?: string,
}
```

##### D. Cap 分档（不一刀切）

| Stance 类别 | 单条 \|Δ\| | 总 ∑\|Δ\| | 条数 |
|---|---|---|---|
| 常态（observe/intel/persuade/scheme） | 3 | 5 | 3 |
| 爆发（confront/mobilize） | 4 | 7 | 3 |
| 破局（abandon） | 6 | 12 | 4 |
| 破局（breakdown） | 8 | 15 | 4 |

**动机**：真实历史的"敬德逼宫"是压力数轴的阶跃，不是线性累积。用常态 cap 5 模拟会把质变日和普通日抹平。breakdown/abandon 全局各 1 次，给足突破通道不怕滥用。

##### E. 降级路径（3 级）

- **Level 1 · 矫正**：超 cap 按比例缩放 / 白名单外 axis 丢该条 / 空字段填兜底 → intent 保留
- **Level 2 · stance 降级**：stance 不在允许清单 → 降为 allowedStances[0]，deltas 清零
- **Level 3 · 整单丢弃**：JSON 解析失败 / 必填缺失 → 当日视为 observe + 空 delta

**动机**：LLM 产出不稳定是常态，降级比报错好。日志记录降级次数作为 prompt 质量指标。

##### F. 软约束（替代硬性 stance 冷却）

prompt 里告知"你最近 3 天选过 {...}"，让 LLM 自己判断是否推进。不硬性禁止连选。**动机**：真实人物会连续几天做同一件事（情报布网），硬冷却会制造无根据的行为切换。

#### 预期收益

- 尉迟 patience 中段在 persuade/mobilize/scheme 三选一，不再被锁死
- action 字段变自由文本，日志/叙事/涌现三倍可读
- pressureDeltas 与 stance 语义对齐，不再有"搜情报→military+2"错位
- breakdown/abandon 作为质变节点给叙事弧打点

#### 待观察

- LLM 提议 delta 的分布是否稳定（靠 clamp/白名单压住）
- prompt token 增量（预计 +30%）
- 首次上线可能需要 2-3 轮 autoplay 回调 cap 幅度

### [eval] 30 天 autoplay 跑局 + detectNarrativeEnding 修复

**来源日志**：[logs/20260420-135617-autoplay.json](../scripts/logs/20260420-135617-autoplay.json)

MAX_DAYS 从 15 提升到 30，成功跑完全程（136 条日志，耗时 ~28 分钟）。Day 2 情报事件场景中，LLM 生成了"秦王被剥夺所有兵权，幽禁于深宫"的结局文本，但游戏未触发 game over，后续 27 天照常推进。

根因：`checkGameOver()` 只检查骨架类型（military_conflict）、时间（month > 6）、压力阈值（≥ 95），完全不读事件结局文本；`handleEventEnd` 把结局文本当纯叙事存储，无机械反馈。LLM 之所以写出终结性结局：prompt 中无任何约束禁止负面结局 + autoplay 输入池含"投降""罢了"等消极词触发了 dismissPatterns 提前收束。

修复：在 `worldSimulator.ts` 的 `handleEventEnd` 中新增 `detectNarrativeEnding(summary)` 方法——正则匹配终结性关键词（幽禁/囚禁/斩首/处死/流放/削爵/废为庶人等），要求主语含"秦王/李世民/世民"避免误匹配 NPC。死亡类 → `coup_fail_captured`，囚禁/流放类 → `deposed`。叙事检测优先于机械检测（`narrativeEnding ?? mechanicalEnding`），零 token 开销，单文件改动。

**待观察**：关键词覆盖率（LLM 可能用隐晦表述绕过匹配）；是否需要在 prompt 端约束 LLM 不写超越当前压力状态的终结性结局。

### 叙事结局安全网 `detectNarrativeEnding`
**为什么**：autoplay 跑出 Day 2 "秦王被幽禁"但游戏继续推进 27 天的 bug。压力阈值和骨架机械检测追不上 LLM 自由发挥。
**影响**：正则扫描事件结局文本，命中幽禁/囚禁/斩首/处死/流放/削爵等关键词（主语限定秦王/李世民/世民）直接触发 game over。叙事检测优先于机械检测，零 token 开销。

### [eval] 日报 description 跳戏修复

**现象**：跑局中出现 "血洗玄武门后，我将目光投向那些在阴影中战栗的朝臣……" 这类日报文本——第一人称 / 文学腔 / 提及尚未发生的玄武门之变，严重破坏沉浸感。

**根因**：`npcPromptBuilder` 里对 `description` 字段只写了「一句话描述（≤30 字，用于日报）」，完全没约束视角/时态/风格/禁忌。

**修复**：
- [npcPromptBuilder.ts](src/engine/world/npcPromptBuilder.ts) 的输出规范段加入 "description 字段写作规范"：明确第三人称外部叙述、当日进行时、平实史书体、禁文学比喻、禁前瞻性词汇，并给两条范例
- [promptConstraints.ts](src/data/promptConstraints.ts) `HISTORICAL_CONTEXT` 禁用词补充：玄武门之变、血洗玄武门、即位、登基、入继大统

验证：tsc ✅ / 226 单测 ✅ / 冒烟待 autoplay 空窗后补跑。

### NPC 决策 100% 降级修复
**为什么**：autoplay 日志显示所有 NPC pressureDeltas 都被 `normalizeIntent` 丢弃。根因是 prompt 里世界状态显示中文标签，但 normalize 期望英文 axisId。
**影响**：npcPromptBuilder 统一用英文 ID；白名单提示、JSON 示例全部改纯英文。NPC 压力白名单按角色职能重分（敬德加 jiancheng_hostility）。

### 叙事 prompt 约束补齐
**为什么**：LLM 一月就写到六月玄武门，不知道当前游戏日期。
**影响**：buildSystemPrompt 追加 3 条写作规则（禁未来事件 / 白描史书体 / 称谓不混用）；buildMessages 结局 prompt 注入 currentDate；硬禁玄武门/登基/贞观/太宗。

### 引擎目录清理
**为什么**：campaignManager / outcomeBuilder / __test__promptBuilder 已被 WorldSimulator + memoryExtractor 替代，留着是噪声。
**影响**：删除三个废弃文件；promptBuilder 从 engine/ 移入 engine/world/；7 个测试迁入 __tests__/。

### [test-bug] v3.4.1 新增测试 + 坑记录

#### 新增测试

| 文件 | 被测模块 | 用例数 |
|------|----------|--------|
| `src/engine/world/__tests__/worldSimulator.test.ts` | `detectNarrativeEnding` 正则结局检测 | 7 |
| `src/engine/world/__tests__/promptBuilder.test.ts` | `buildSystemPrompt` 叙事规则 + `buildMessages` currentDate 注入 | 8 |
| `src/engine/world/__tests__/npcPromptBuilder.test.ts` (+4) | 英文 axisId 输出 + NPC_IMPACT_PROFILES 白名单内容 | 20（原 16） |

生产代码调整：
- `detectNarrativeEnding` 从 WorldSimulator private 方法提取为独立导出纯函数，方便直接测试
- `buildMessages` 新增 `currentDate?: string` 第 5 参数（不超 arch-guard 5 参数限制）

目录整理：
- 7 个 `.test.ts` 从 `src/engine/world/` 迁入 `src/engine/world/__tests__/`
- `promptBuilder.ts` 从 `src/engine/` 移至 `src/engine/world/`
- 删除废弃文件：`campaignManager.ts`、`outcomeBuilder.ts`、`__test__promptBuilder.ts`

```
 Test Files  11 passed (11)
      Tests  245 passed (245)
   Duration  1.14s

 tsc -b + vite build  通过
 冒烟 4/4 通过
```

#### [test-bug] 坑 1: death 正则无主语限制

`detectNarrativeEnding` 的死亡模式 `/被.*?(?:斩首|处死|...)/` 不限主语——"建成被处死"也会匹配返回 `coup_fail_captured`。这是设计意图（场景中出现任何处死都是严重事件），但写测试时容易误以为需要"秦王"开头。capture/exile 模式才有主语限制。

#### [test-bug] 坑 2: npcPromptBuilder 白名单提示已改为纯英文 ID

v3.4.1 将白名单提示从 `${中文标签}(${英文id})` 改为纯英文 `${id}`。原有测试 `expect(result).toContain('军事准备')` 因此失败，需改为 `expect(result).toContain('military_readiness')`。

---

## 2026-04-19 · v3.2 + v3.3 + v3.4（同日三批）

### 跨场景角色记忆（v3.2）
**为什么**：场景结束 NPC 就"失忆"，下一场从零开始。长孙昨天刚承诺的事今天不记得。
**影响**：新建 memoryExtractor，handleEventEnd 后 fire-and-forget 调 LLM 提取记忆（~200-300 tokens），写入 WorldState.characterMemories 随存档持久化。npcPromptBuilder 注入最近 5 条，每角色上限 10 条，满了保留最新。

### 叙事烈度控制 `getNarrativeIntensity`
**为什么**：正月初四调屈突通进京，LLM 直接跳到六月玄武门。根因三叠加：情报/召见骨架几乎无门槛（第 2-4 天就触发）、LLM 不知道当前压力对应的烈度、没有时间跳跃约束。
**影响**：按压力均值四档（低/中/高/极高）返回允许的叙事类型；场景对话 / NPC 决策 / 事件生成三处 prompt 都注入。LLM 不能再靠历史知识抢跑。

### 美术重构 Sprint 1（v3.3）
**为什么**：原始 UI 是功能草图，没有游戏感。用户反复说"感觉在读文本不是玩游戏"。
**影响**：全屏场景 + 浮动面板取代 flex 分段；SceneBackground 5 层叠加（渐变 + 色调 + 烛光 + 噪点 + vignette）模拟电影感；对话从滚动流改为单条翻页 + 毛玻璃；ActionPanel 卡片化；标题海报化。全 CSS，无图片依赖。

### Prompt 约束中枢 promptConstraints.ts（v3.4）
**为什么**：称谓规则、禁用词、人物表散落在 promptBuilder / npcPromptBuilder / eventRunner 三处，改一次要同步三份。
**影响**：统一为 `buildConstraintBlock()`，历史事实层（不变）+ 叙事节奏层（随压力动态）。消费方不再各自拼字符串。删除旧 historicalConstraint.ts。

### NPC 决策并行化
**为什么**：3 个 NPC 每日串行调 LLM，光这一步 3x 延迟。
**影响**：runWorldTick 分三阶段——规则过滤（串）→ LLM 推理（Promise.all 并）→ 结果合并（串）。3x 降到 1x。

### autoplay 自动跑局脚本
**为什么**：手动测一遍要半小时，无法快速回归。
**影响**：vitest 驱动，mock localStorage，随机活动 + 6 类玩家输入池（观望/散场/决断/消极/对抗/申辩），实时 flush JSON 日志，内置 13 RPM 滑窗限速器适配 Gemini 免费层。⚠️ Windows 下有间歇性模块加载竞争，`--reporter=verbose` 稳定。

### LLM `<thought>` 标签泄露修复
**为什么**：玩家看到 LLM 的 `<thought>...</thought>` 思考原文直接出现在对话里。
**影响**：jsonExtractor 新增 `stripThinkingTags()` 覆盖 6 种标签（thought/thinking/think/reasoning/reflection/inner_monologue），sceneManager 入库前 + 解析后双保险清洗。

### @tailwindcss/vite 与 vitest 竞争
**为什么**：vitest 全量跑偶发 `Cannot read properties of undefined (reading 'config')`，所有测试一起红。根因是 tailwind 插件在 vitest 初始化时 `configResolved` hook 竞争。
**影响**：第一版用 `server.deps.inline`（失效）；第二版改 vite.config.ts 为 async 函数，`!process.env.VITEST` 时才动态 import tailwind。测试环境彻底不加载该插件。

### [test-bug] 冒烟测试 + LLM 集成测试 + Lint 修复（4/19）

#### 冒烟测试

| 检查项 | 结果 |
|--------|------|
| 构建 (tsc + vite build) | 通过，355ms |
| Lint (eslint) | 通过（修复后 0 errors） |
| 单测 (vitest) | 220/220 通过 |

#### Lint 修复（5 errors）

| 文件 | 问题 | 修复 |
|------|------|------|
| `src/components/GameScene.tsx:23` | `useMemo` 内调用 `Math.random()`（React 纯度规则） | 改为 `useState` 初始化随机 index |
| `src/components/GameScene.tsx:25` | `useMemo` 多余依赖 `gameState.isNpcThinking` | 随上一条一并移除 |
| `src/components/SettingsModal.tsx:30` | 混合导出组件和 `loadSavedConfig` 函数，破坏 fast refresh | `loadSavedConfig` + `STORAGE_KEY` 抽到 `settingsStorage.ts` |
| `src/engine/promptBuilder.ts:216` | `_gameState` 参数未使用 | 删除参数，同步更新调用方 `__test__promptBuilder.ts` |
| `src/engine/world/pressure.test.ts:132,254` | 两处 `as any` | 改为 `as PressureAxisId` / `as Record<PressureAxisId, number>` |

#### LLM 集成测试（真实 API 调用）

新增脚本 `scripts/llmIntegrationTest.ts`，用 `npx tsx` 在 CLI 运行，读取 `.env` 配置调用真实 LLM。

| 测试 | 耗时 | 结果 |
|------|------|------|
| LLM 基础连通（streaming chat） | 11s | 17 chunks，回复正常 |
| NPC 决策（长孙无忌 lobby/wait） | 24s | 返回合法 JSON，决策: lobby |
| 事件变体生成（情报骨架） | 40s | "禁宫密诏传"，3 phases |
| 记忆提取（memoryExtractor，新模块） | 19s | 提取 2 条记忆，importance/emotionalTag 格式正确 |

**4/4 passed**（首次跑时事件变体测试因断言字段名写错 `title` 应为 `name` 而失败，修正后全部通过）

#### [test-bug] Bug 修复：LLM `<thought>` 标签泄露

**现象**: 游戏中 LLM 返回的 `<thought>...</thought>` 思考标签内容直接显示给玩家。
**根因**: `extractJson` 和 `parseNpcResponse` 均无过滤逻辑，`<thought>` 内容直达前端渲染。
**修复**:
| 文件 | 改动 |
|------|------|
| `src/engine/jsonExtractor.ts` | 新增 `stripThinkingTags()`，覆盖 6 种标签（thought/thinking/think/reasoning/reflection/inner_monologue），大小写不敏感 |
| `src/engine/sceneManager.ts` | 存入 `llmMessages` 前清洗原始响应；解析后对 `narrator` 和 `npcDialogues.content` 也做清洗（双保险） |
| `src/engine/jsonExtractor.test.ts` | 新增 7 个测试覆盖标签剥离 |

#### [test-bug] `@tailwindcss/vite` 竞争条件（再修复）

之前的 `server.deps.inline` 方案失效。改为 `vite.config.ts` 使用 async 函数形式，`!process.env.VITEST` 时才动态 `import('@tailwindcss/vite')`，彻底避免插件在测试环境初始化。

**注意**: 默认 reporter 下仍有间歇性竞争（Windows 特有），`--reporter=verbose` 模式稳定通过。与代码无关，是 vitest 自身问题。

```
 Test Files  9 passed (9)
      Tests  220 passed (220)
   Duration  768ms
```

#### v3.2 构建验证

```
npm run build  → tsc -b + vite build 通过（285ms）
```

---

## 2026-04-17 · v3.1

### 节奏加速
**为什么**：测试反馈事件触发太慢，前十天几乎什么都不发生。
**影响**：压力轴 velocity 全线翻倍（military_readiness 除外）；去掉 4 个骨架的 minDay；情报事件 minDay 5→2；游戏时间上限 8 月→6 月。

### 5 种结局体系
**为什么**：原结局只有"武装冲突触发=胜利"一个分支，隐忍/失败路线没有闭环。
**影响**：按 military_readiness 和关键压力组合区分——兵变成功 / 失败被擒 / 内战惨胜 / 隐忍被废 / 兄弟和好（极难）。EndingScreen 每种独立标题和叙述。

### 日报重复修复
**为什么**：同一条 NPC narrativeHook 在 briefing 文本和"府中动态"卡片各显示一次，视觉像 bug。
**影响**：buildDailyBriefing 只保留日期头 + 事件预告，NPC 动态交给组件独立渲染。

### 活动文案从 2-3 条扩到 ~50 条
**为什么**：同一个活动每次显示同一句话，明显破坏沉浸感。
**影响**：12 个日常活动 flavorText 扩充到每个 4-6 条，覆盖紧张/日常/反思三种风格。

### [test-bug] Layer 1 补充：骨架模板单测（77 用例）

| 文件 | 被测模块 | 用例数 |
|------|----------|--------|
| `src/data/skeletons/skeletons.test.ts` | 8 个骨架模板 + checkEventTriggers 集成 | 77 |

测试重点：
- **结构完整性**: 8 骨架 × 7 项校验（非空字段、合法 axisId、turnRange min≤max、softCap<hardCap 等）
- **特征断言**: 每个骨架的关键业务值（precondition 阈值、priority、maxOccurrences、特殊类型如 npc_patience_below）
- **优先级排序**: militaryConflict(95) > subordinateUltimatum(90) > ... > intelligenceEvent(40)
- **checkEventTriggers 集成**: 初始不触发、高门槛不触发、OR 逻辑触发、day_range 阻断、优先级竞选

#### [test-bug] 坑 1: precondition params 字段名
骨架 `preconditions` 中 `pressure_above` 的阈值参数名是 `value`（不是 `threshold`）。`threshold` 只在 `pressureTriggers.axes` 里用。

#### [test-bug] 坑 2: checkEventTriggers 最多返回 1 个
函数内部 `eligible.slice(0, 1)`，防止事件洪泛。测试不能期望返回多个事件。

```
 Test Files  6 passed (6)
      Tests  175 passed (175)
   Duration  830ms
```

### [test-bug] Layer 2：LLM 集成测试（Mock）

| 文件 | 被测模块 | 用例数 |
|------|----------|--------|
| `src/engine/world/npcPromptBuilder.test.ts` | NPC 决策 prompt + 事件生成 prompt 构造 | 14 |
| `src/engine/world/eventGenerator.test.ts` | generateEventInstance + resolveEventInstance | 13 |
| `src/engine/world/eventRunner.test.ts` | EventInstance→SceneConfig 适配 + 收束指令 | 9 |

**合计: 3 个文件, 36 个用例**

Mock 策略：不调真实 LLM。构造三种 mock `LLMProvider`：
- **成功 mock**: `chat()` 返回预设合法 JSON
- **垃圾 mock**: `chat()` 返回非 JSON 字符串
- **异常 mock**: `chat()` 抛 Error

测试重点：
- **npcPromptBuilder**: prompt 包含角色名、压力轴标签、patience/commitment、enabled actions、JSON 格式指令、eventLog
- **eventGenerator**: LLM 成功→解析 EventInstance；垃圾→重试一次→仍失败→null；异常→null；验证 messages 结构；`res.content` fallback；缺字段返回 null；skeleton 字段透传
- **resolveEventInstance**: LLM 成功→返回；失败+fallback→返回 fallback；失败无 fallback→硬兜底（skeleton 最小信息）
- **eventRunner**: 字段映射（softCap→minTurns、hardCap→maxTurns）；id 格式；收束指令含 resolutionSignals；softCap 提示含 coreConflict

#### [test-bug] `@tailwindcss/vite` 插件竞争问题（永久修复）

- **现象**: `npx vitest run` 连续失败，所有文件报 `TypeError: Cannot read properties of undefined (reading 'config')`
- **根因**: `@tailwindcss/vite@4.2.2` 插件在 vitest 初始化时 `configResolved` hook 竞争
- **修复**: `vite.config.ts` test 配置添加 `server.deps.inline: [/@tailwindcss/]`
- **验证**: 连续两次全量运行稳定通过

```
 Test Files  9 passed (9)
      Tests  213 passed (213)
   Duration  709ms
```

---

## 2026-04-15 · v3.0（大改）

### 从固定剧本升级为涌现式世界模拟
**为什么**：v2.0 的固定 6 场景序列玩一遍就没了，玩家的选择影响不到"会发生什么"，只影响"怎么过这一场"。想让玄武门变成压力积累的可能结果之一，而不是必然剧本。
**影响**：CampaignManager 废弃，换成 WorldSimulator。核心范式变化：
- 7 条压力轴驱动世界运转（0-100，各自 velocity/baseline/floor/ceiling/decayRate）
- 8 个事件骨架模板 + LLM 变体生成，同骨架在不同压力状态下长成不同事件（建成敌意 78 → 东宫鸩酒 / 元吉冒进 85 → 猎场伏弓）
- NPC Agent 两阶段决策：确定性规则过滤 → LLM 推理
- 3 个幕后 Agent（建成/元吉/李渊）纯确定性压力贡献，不烧 token
- 日常活动层（5 类 12 项）+ 每日三时段，活动选择时间掩盖后台 NPC LLM 延迟
- 状态机重写：title → daily_activities → daily_briefing → [event_scene] → daily_activities → ... → game_over
- localStorage 自动存档（事件场景中不存，避免不可序列化的中间态）

### 确定性引擎模块 Vitest 单测（98 用例）
**为什么**：v3.0 核心是一堆纯函数（压力 tick、日历、NPC 过滤、活动分发、JSON 提取），没基础单测不敢动。
**影响**：5 个测试文件覆盖 20+ 导出函数，重点测纯函数不可变性、边界钳位、LLM 输出容错。骨架模板单测追加 77 用例。

### [test-bug] Layer 1 详细记录：确定性引擎模块单测

#### 基础设施

- 安装 vitest v4.1.4
- `package.json` 新增 `test` / `test:watch` 脚本
- `vite.config.ts` 添加 `test: { include: ['src/**/*.test.ts'] }` 配置

#### 测试文件与覆盖范围

| 文件 | 被测模块 | 测试函数 | 用例数 |
|------|----------|----------|--------|
| `src/engine/jsonExtractor.test.ts` | JSON 提取器 | `extractJson` | 14 |
| `src/engine/world/pressure.test.ts` | 压力系统 | `tickAxis`, `tickPressure`, `applyPressureModifiers`, `checkEventTriggers`, `snapshotPressure` | 25 |
| `src/engine/world/calendar.test.ts` | 日历系统 | `createCalendar`, `advanceDay`, `advanceTimeOfDay`, `formatDate`, `formatCalendar`, `formatMonth`, `isAfterDate`, `getDaysInMonth` | 27 |
| `src/engine/world/npcAgent.test.ts` | NPC Agent | `tickNpcAgent`, `filterPlausibleActions`, `recordNpcAction`, `adjustPatience` | 18 |
| `src/engine/world/activities.test.ts` | 日常活动 | `getActivitiesForTimeSlot`, `applyActivityEffects`, `getFlavorText` | 14 |

**合计: 5 个文件, 98 个用例**

#### 测试重点

- **纯函数不可变性**: 每个模块都测了 "is pure — does not mutate input"
- **边界钳位**: floor/ceiling 钳位、patience 0-100 范围
- **业务逻辑**: pressure 阈值触发、cooldown 冷却期、maxOccurrences 上限、NPC 决策规则匹配、活动效果分发
- **LLM 输出容错**: JSON 提取器对 markdown 包裹、截断修复、前后多余文本、嵌套结构的处理
- **中文格式化**: 日历的农历日期格式（初一~三十、正月~十二月）

#### [test-bug] Bug 1: pressure.test.ts — `makeMinimalSkeleton` 未应用 overrides

- **现象**: `checkEventTriggers` 的 4 个测试用例失败（阈值过滤、冷却期、前置条件、优先级排序）
- **根因**: 测试辅助函数 `makeMinimalSkeleton(overrides)` 接收了 overrides 参数但忘记在返回对象中展开 `...overrides`，导致所有覆盖项（threshold、cooldownDays、preconditions、id）被静默忽略
- **修复**: 在返回对象末尾添加 `...overrides`
- **影响**: 仅测试代码，不影响生产

#### [test-bug] Fix 2: pressure.test.ts — TypeScript 编译错误

- **TS6133**: 导入了 `createPressureAxis` 但未使用 — 移除
- **TS2739**: `SceneResolution` 缺少 `softCap` / `hardCap` 字段 — 在 `makeMinimalSkeleton` 中补全

```
 Test Files  5 passed (5)
      Tests  98 passed (98)
   Duration  531ms

 tsc -b --noEmit  0 errors
```

---

## 2026-04-14 · v2.0

### 从单场景扩展为 6 场景时间线
**为什么**：v1.0 是单场"午夜密议"MVP，验证了 SceneManager 的可行性；需要把半年博弈铺开。
**影响**：新建 CampaignManager 编排多场景，OutcomeBuilder 启发式提取场景结果（关键决策 + 关系变化），跨场景记忆传递。新增 5 个场景（暗流涌动 / 东宫鸩酒 / 洛阳之议 / 围困削权 / 太白经天），加上午夜密议共 6 场。

### 三层记忆系统
**为什么**：只有场景内上下文，NPC 在不同场景间"失忆"。
**影响**：Character 类型扩展 foundationalMemory + shortTermMemory + reflections；memoryLoader.ts 用 Vite 静态导入 + Markdown 解析；4 个角色各建 foundational.md。

### 称谓规则从 5 行扩到完整关系表
**为什么**：测试反馈 NPC 称谓混乱（直呼李世民姓名、李渊被叫"大王"等）。
**影响**：正式称谓 + 亲属称呼 + 皇族互称 + 配角行为规范四档。characterId 从 `"npc 的 id"` 改为列出具体可选值，修复 NPC 名字显示为拼音的问题。

### 场景合理性修正
**为什么**：测试发现政治密谋场景里武将在场（尉迟敬德进暗流涌动 / 洛阳之议），违和。
**影响**：按场景性质筛人物，武将只进军事/摊牌场景，文官主导密议。鸩酒场景补元吉 + 李神通宗室身份。

---

## 2026-04-12 · v1.0

### 单场景 MVP（午夜密议）
**为什么**：先用一个完整场景验证"LLM 驱动古文对话"的可行性，再决定要不要继续做。
**影响**：搭起 React + TS + Vite + Tailwind 骨架；SceneManager（状态机 + 观察者）；PromptBuilder（纯函数组装 system prompt）；LLM 适配器 Registry 模式 + 6 家 provider（OpenAI/Anthropic/DeepSeek/Moonshot/Qwen/Zhipu）+ SSE 流式。

### 角色 + 场景设计
**为什么**：需要让 NPC 有稳定人格和语言风格，否则 LLM 每次生成都飘。
**影响**：CharacterCore 类型——Big Five 人格 + 技能 + 关系网络（信任度 0-100）+ 语言风格（register / patterns / never）。午夜密议场景 3 阶段（危机揭示 → 激辩定策 → 最终决断），10-15 回合。

### JSON 提取器容错
**为什么**：LLM 返回经常被 markdown 代码块包裹 / 尾部截断 / 前后多余文本，直接 JSON.parse 挂掉。
**影响**：括号计数精确提取 + 截断修补 + markdown 兼容 + 文本 fallback。后来加的 `stripThinkingTags()` 是这套逻辑的延伸。

### 结局触发软硬双轨
**为什么**：单纯按回合数结束不自然，纯语义识别又可能永远不结束。
**影响**：硬触发（hardCap 回合数兜底）+ 软触发（≥minTurns 后识别玩家决断意图）。maxTokens 调到 4096 防 JSON 截断。

---

## 测试层概览

| Layer | 范围 | 方案 | 状态 |
|-------|------|------|------|
| Layer 1 | 确定性引擎模块 | Vitest 单测 | **已完成** (175 cases) |
| Layer 1+ | 骨架模板 | Vitest 单测 + checkEventTriggers 集成 | **已完成** (98 cases) |
| Layer 1++ | 叙事结局检测 + 白名单 | Vitest 单测 | **已完成** (10 cases) |
| Layer 1+++ | LLM 基础设施 | retry/validators/anthropic caching | **已完成** (29 cases) |
| Layer 1++++ | 玩家行为日志 | Vitest 单测 | **已完成** (7 cases) |
| Layer 2 | LLM 集成（Mock） | Mock LLMProvider + 契约测试 | **已完成** (36 cases) |
| Layer 2+ | LLM 集成（真实 API） | `scripts/llmIntegrationTest.ts` CLI 脚本 | **已完成** (4 cases) |
| Layer 2++ | Prompt 构造 | buildSystemPrompt + buildMessages 输出断言 | **已完成** (8 cases) |
| 冒烟 | 构建 + Lint + 单测 | `npm run build && npm run lint && npx vitest run` | **已完成** (302 cases) |
| Layer 3 | React 组件 | Vitest + React Testing Library | 待实施 |
| Layer 4 | 端到端流程 | Playwright / 手动剧本 | 待实施 |

---

## 模板

```
## YYYY-MM-DD

### 改动标题（具体，如"prompt caching"）
**为什么**：
**影响**：
```
