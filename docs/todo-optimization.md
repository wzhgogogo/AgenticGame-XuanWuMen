# 待优化清单

> 按优先级组织，同一区块内按重要性从上到下。勾选完成的条目保留一段时间以便追溯，超过两个版本再清理。
>
> **当前状态**：v3.4.4 已发布（结局系统重写 / 事件骨架结构化 + 11 骨架 / 快进机制）。**核心机制层冻结**——下一阶段 v3.4.5 是体验打磨（美术 + 等待时间 + UI + bug + eval），不再扩内核。

---

## v3.4.5 路线图（体验打磨阶段）

> v3.4.4 把"输得起的 5 结局光谱 + outcome 资产剥夺 + 快进"这块地基打好了，但跑局体验仍粗糙。v3.4.5 不再加内核，集中在四个用户可感知的体验维度上。

### P0 · v3.4.4 完成度补丁（先修补再开新）

> v3.4.4 代码层已落地，但有三件事影响"是否真的完成"——补完才能放心进入体验阶段。

- [ ] **autoplay 跑 5+ 局验证 5 结局触达** — 目前 endingResolver 的优先级链 F5 → E3 → E1 → F1 → N1 只在数据结构层成立，行为层未跑过。需确认每个结局至少触发 1 次；统计 chosenOutcome 分布（如 failure < 10% 则在 prompt 中加权重提示，避免 LLM 过度倾向 success/partial 让玩家"输不掉"）
- [ ] **补 2-3 个历史时间窗 flag** — 当前只有 `tujue_invasion`（三月中旬）。武德九年还有"杨文干事件余波 / 太白经天 / 昆明池阅兵 / 洛阳行台争夺"等历史背景节点，至少补 2-3 个，避免快进 7 天什么也不发生。涉及：worldSimulator.ts runWorldTick 时间窗触发器段
- [ ] **旧存档迁移实测** — `migrateWorldState` 加了 status / playerOffices / outcomeEffects wrap 三层补丁，但本地未跑过 v3.4.3 旧存档升级。准备一份 v3.4.3 时期的 localStorage dump，载入验证不崩；崩则 schema assert 出更友好提示
- [ ] **endingResolver 优先级 freeze 测试** — F1/N1 都可能在 day 180 触发，F5/E3 都依赖军事冲突。补 endingResolver.test.ts 单测，每个结局 case 一个最小 state，防止后续改阈值时回归

### P0 · 等待时间优化

> CLAUDE.md 已记录"LLM 等待时间长是最大体验问题"。v3.4.4 三 NPC 升级后每日 LLM 调用从 3 升到 6（Promise.all 并行），免费档因 RPM 可能 3-4× 慢。这块是 v3.4.5 投入产出比最高的。

- [ ] **NPC 决策 prompt 合并** — 当前每个 NPC 每日独立调用一次 LLM（6 NPC = 6 次），合并为一次调用让 LLM 一次性输出所有 NPC 的决策 JSON 数组，减少 ~80% 调用次数。涉及：worldSimulator.ts 决策阶段、npcPromptBuilder.ts、新增 batchNpcDecision prompt
- [ ] **system prompt 精简** — 角色描述压缩到关键信息（性格关键词 + 语言风格 + 核心目标），去掉详细技能分值、完整记忆列表、关系信任度数值等，预计减少 ~60% 输入 tokens。涉及：promptBuilder.ts buildSystemPrompt（~80 行函数超 arch-guard 50 行限制）
- [ ] **超时兜底（fallback 变体）** — 事件生成超过 20 秒直接用 skeleton fallback 变体（需先完成 fallback 变体写作）。涉及：eventGenerator.ts、callLLMWithRetry 的 timeout 路径
- [ ] **过场文案多样化** — 按 `skeleton.category` 选不同 loading 文案（"有人匆匆来报……""步入宴厅，灯火辉煌……"等），减少"夜幕降临"重复感。涉及：App.tsx handleEndDay / handleProceedFromBriefing
- [ ] **流式渲染** — 当前等完整响应才显示，后续做流式 JSON 增量解析，先显示旁白再逐条显示 NPC 对话
- [ ] **maxTokens 动态调整** — 结局阶段需要更多输出 token，普通回合可以用更少的
- [ ] **模型自动降级/切换** — 主模型返回 429 限流或响应超时时，自动切换到备选模型，无需手动改 .env 重启

### P0 · UI / 交互打磨

> art-direction.md 已定义电影叙事风设计系统，尚未完全落地。v3.4.4 把 DeskLayout 视觉层做完了一半，但日报 / 事件场景视觉仍粗糙。

- [ ] **日报 / 活动 / 事件场景视觉打磨** — 按 art-direction 的配色、字体、节奏应用到 DailyBriefingScreen / GameScene（DailyActivityScreen 已在 v3.4.3 走完 DeskLayout）
- [ ] **压力轴可视化** — 七条压力轴当前仅文字呈现，需要更直观的可视化（条形 / 环形 / 氛围色调映射）
- [ ] **对话打字机效果** — 解析完 JSON 后逐字 / 逐条动画显示，而非一次性全部出现
- [ ] **过场与状态切换动画** — title→daily→briefing→scene 之间的转场过渡，避免硬切
- [ ] **ActionPanel 按钮优先 + 自由输入兜底** — 把 LLM 返回的 `suggestedActions` 从提示文字升级为一等公民的可点击按钮。玩家做的是"决策"而非"编剧"
- [ ] **suggestedActions 区分言语 / 动作** — prompt 中区分 dialogue / action 两类 suggestedActions，让 LLM 每轮同时给出言语选项和动作选项（如"🗡️ 拔剑摔在案上""🍷 端起酒杯一饮而尽"）
- [ ] **NPC 主动逼迫玩家决策** — 关键时刻 NPC 直接发起质问，玩家必须回应（如："殿下——应是不应？"）

### P0 · Bug / Eval / 调参

> 跑局过程中暴露的小问题，单个不致命但累积破坏体验。

- [ ] **#3 事态可选择不处理** — DailyBriefingScreen 加"按下不表"按钮，跳过事件但施加惩罚压力（+5 qinwangfu_desperation, +3 相关轴）。涉及：DailyBriefingScreen.tsx, worldSimulator.ts, App.tsx
- [ ] **#6 场景内 pill 优化** — eventGenerator prompt 中要求 suggestedActions 必须具体有画面感（如"拿起酒杯佯装饮酒""质问建成为何设宴"），而非抽象概念（如"观察局势"）。涉及：npcPromptBuilder.ts
- [ ] **#8 LLM 总是生成"突厥急报"** — 情报骨架 constraints 加"不要重复已出现的主题，来源要多样化"；buildEventGenerationPrompt 注入最近 3 条 eventLog summary 让 LLM 避免重复。涉及：intelligenceEvent.ts, npcPromptBuilder.ts
- [ ] **autoplay.test.ts vitest Windows 不稳定** — CLAUDE.md 已记录，模块加载竞争待排查
- [ ] **EventSceneWrapper 的 setTimeout 未在 unmount 时清理** — CLAUDE.md 已记录的小漏洞
- [ ] **arch-guard 超限文件拆分** — worldSimulator.ts (755+ 行) 和 activities.ts (783 行) 超 300 行限制；buildSystemPrompt ~80 行超 50 行限制
- [ ] **eval P1 回顾 + 阈值微调** — autoplay 跑 5 局后回看 P1 报告（时间跳跃 / 称谓 / 虚构 / 人设），把高频违例点回头修 prompt
- [ ] **chosenOutcome 分布观察** — autoplay 5 局后统计 outcome 分布，failure / disaster 触发率过低则在 npcPromptBuilder 末尾加"按事态严重程度真实选择，不要默认 success"提示

### P1 · 美术 / 音效

> 把 art-direction.md 里没落地的内容补完。

- [ ] **背景音乐** — title / daily_activities / event_scene / game_over 各一首
- [ ] **按钮音效** — 选择活动 / 结束今日 / 进入事件 / suggestedAction 点击
- [ ] **关键事件音效** — 暗杀 / 朝堂弹劾 / 玄武门发动 / NPC 阵亡
- [ ] **字体优化** — Noto Serif SC 是基线，关键标题可考虑加书法字体
- [ ] **DeskLayout 细节打磨** — 印章、地图、物件的细节优化
- [ ] **结局画面美术** — EndingScreen 当前文字为主，按 5 结局各做一张氛围插画

### P2 · 性能 / Token 消耗（次轮考虑）

- [ ] **对话历史滑窗** — 只保留最近 N 轮原文（如 5 轮），更早的替换为摘要，避免 context 线性增长。*注：v3.4.3 prompt caching 后 system 前缀不重复计费，但 llmMessages 尾部仍线性增长*
- [ ] **摘要压缩** — 每隔几轮用小模型将旧对话压缩成 200 字前情摘要
- [ ] **角色信息按需注入** — system prompt 只放最小角色卡，某角色被提及 / 参与时再动态附带其详细背景。*注：与"NPC 决策 prompt 合并"相关，合并时一并做*
- [ ] **promptBuilder.ts 输出审计** — buildSystemPrompt 现在注入 playerActionLog + longTermSummary + relationshipOverrides，需实测最终 system prompt 字符数 / token 数建立基线，针对性裁剪
- [ ] **JSON 输出强制约束** — 部分模型支持 `response_format: json_object`，可减少格式错误

### P3 · 下一版本内容（v3.5+ 候选，不在 v3.4.5 范围）

- [ ] **#10 主动发起多日任务** — 新增 Mission 类型，activeMissions 加入 WorldState，3-4 个"策略"类活动创建 Mission 而非即时效果，runWorldTick 每日推进进度
- [ ] **情报 / 线索系统** — 玩家收到密报、截获书信、查看地图等，需要判断和决策；新 UI 组件情报卡片、线索面板
- [ ] **NPC 倒计时 + 沉默选项** — 高压场景加 10~15 秒倒计时，超时视为"沉默"，沉默本身也是一个有后果的选择
- [ ] **玩家主动布局朝堂骨架**（v3.4.4 评审中明确冻结，留 v3.5+ 再说）

### P3 · 部署与基础体验

- [ ] **前后端分离** — 当前前后端耦合，上线前拆为独立前端（React SPA）+ 后端（API 服务）
- [ ] **移动端适配** — 检查小屏幕下的布局、字体大小、触控交互

---

## ✅ v3.4.4 已完成（保留追溯）

> 2026-04-26 一次性落地三大块：三 NPC 升级 + 结局系统重写 + 骨架结构化。原 P0 区块"扩充幕后 NPC 为 Agent"和"骨架事件拆分与 fallback"在此被覆盖；详细记录见 docs/devlog.md。

### 三 NPC 升级（建成 / 元吉 / 李渊 → 完整 NPC）

- [x] **PR1·建成（li_jiancheng）** — 完整 Character + foundational.md（6 条记忆）+ 4 档 stance（lobby / scheme / plot / assassinate）
- [x] **PR2·元吉（li_yuanji）** — 完整 Character + foundational.md + 5 档 stance（含 fishing 二虎相争）
- [x] **PR3·李渊（li_yuan）** — 完整 Character + foundational.md + 5 档 stance（含 balance_act 帝王心术）
- [x] **`npcDecisionRules.ts` 三套规则** — NPC_IMPACT_PROFILES / NPC_PATIENCE_DECAY / 三人 stance 阶梯
- [x] **`offstageAgents.ts` 改为空数组** — 文件保留作占位，等待补充秦叔宝 / 程咬金 / 魏征
- [x] **eval 称谓 / 人设正则** — promptConstraints.ts 紧凑版称谓规则补齐：建成称世民"二郎/秦王"、元吉称"二哥/秦王"、禁用"殿下"
- [x] **autoplay 跑局验证** — 281 单测全过

### 骨架事件结构化 + 改造 8 + 新增 3

- [x] **SceneResolution 重构** — resolutionSignals 改为 ResolutionSignal[]（{outcome, description}）；baseOutcomeEffects 升级为 TaggedOutcomeEffect[]
- [x] **chosenOutcome 闭环** — LLM 在场景结束 JSON 返回 chosenOutcome ∈ {success, partial, failure, disaster}；handleEventEnd 据此筛 outcome 全部生效；兜底 success
- [x] **改造现有 8 骨架** — banquet / political / assassination / subordinate / imperial / intelligence / ally / military 全部加 failure/disaster outcome 候选
- [x] **新增 courtImpeachment 骨架** — 朝堂构陷罢黜（failure 掉天策上将；disaster 掉尚书令+雍州牧 + impeached_severely flag）
- [x] **新增 courtCounterstrike 骨架** — 朝堂主动反击（success 伤建成；disaster 玄龄入狱）
- [x] **新增 seizeMilitaryCommand 骨架** — 夺兵权请缨（failure ceiling -30 + military_stripped flag；disaster 加掉左武卫）
- [x] **`tujue_invasion` 时间窗 flag 触发器** — runWorldTick 在 isAfterDate(cal, 3, 15) 后种入

### 结局系统重写

- [x] **OutcomeEffect discriminated union** — pressure / loseNpc / injureNpc / loseOffice / confiscateMilitary / flag
- [x] **NpcAgentState.status** — active / exiled / imprisoned / deceased / dispatched + worldSimulator 单一过滤入口
- [x] **WorldState.playerOffices** — 5 官职 + LI_SHIMIN_INITIAL_OFFICES 注入
- [x] **FlagKey 白名单** — src/data/flags.ts + applyOutcomeEffects 校验
- [x] **endingResolver** — 5 结局光谱（E1/E3/F1/F5/N1），优先级链 F5 → E3 → E1 → F1 → N1，**直接替换** checkGameOver
- [x] **ENDING_LABELS 映射** — src/data/endings.ts code/name/description
- [x] **applyOutcomeEffects 单一入口** — pressure.ts，pressure 分支复用 applyPressureModifiers；extractPressureModifiers 保持 eventLog.pressureEffects 字段向后兼容
- [x] **存档迁移** — migrateWorldState 自动补 status / playerOffices / outcomeEffects wrap

### 快进机制

- [x] **planFastForward** — src/engine/world/fastForward.ts 纯只读判定
- [x] **WorldSimulator.fastForward(maxDays)** — 循环 endDay+proceedFromBriefing，每天重 plan，遇 pendingEvents/event_scene/game_over 立刻退出
- [x] **DailyActivityScreen UI** — [快进 3 日] [快进 7 日] 按钮组

---

## ✅ v3.4.3（2026-04-24）已解决

### LLM 管线可靠性与感知加强

- [x] **`callLLMWithRetry` 统一重试封装** — `src/engine/llm/retry.ts`。指数退避 1→24→…→30s、出错分类（429/5xx/网络 → 重试；4xx/Abort → 不重试）、validator hook。已接入 memoryExtractor + eventGenerator
- [x] **输出 validator** — `src/engine/llm/validators.ts`。`forbiddenWordsValidator`（22 个穿越词/后世称号）、`jsonValidator(schema?)`、`combineValidators` 可套套
- [x] **Prompt caching（Anthropic）** — `LLMMessage.cacheBoundary` 新字段；anthropic.ts 切换到 block 数组 + `cache_control: ephemeral`；`buildMessages` 标记场景 system prompt 为缓存边界。同场景后续轮次节省 ~80% 输入 tokens
- [x] **记忆 top-k + 长期摘要** — `selectMemories(topK, recentGuaranteed)`；超 15 条时 LLM 提炼为 `characterLongTermSummary`
- [x] **运行时关系动态** — `relationshipOverrides` + `trustDelta`；memoryExtractor 同时抽取 `relationshipDeltas`；NPC/场景 prompt 双注入；DebugPanel 可视化
- [x] **事件变体预热** — `backgroundEventPromise` / `startEventPrefetchIfPending`；玩家看日报期间后台跑 LLM，enterEvent 直接取用
- [x] **玩家行为日志 playerActionLog** — `WorldState.playerActionLog` 滑窗 30 条；`applyActivity` / `handleEventEnd` 写入；NPC 决策 prompt（近 5 天，6 条）、场景 system prompt（近 7 天，8 条）注入；autoplay JSON dump 自动带出供 eval 读取
- [x] **测试规模** — 254 → 281（v3.4.4 进一步到 302）。build 全绿

---

## ✅ 早期已解决

- [x] **#12 跨场景对话记忆** — handleEventEnd 后用 LLM 提取关键对话/承诺存入 `WorldState.characterMemories`，下次场景 system prompt 注入。涉及：world.ts, worldSimulator.ts, sceneManager.ts, promptBuilder.ts
