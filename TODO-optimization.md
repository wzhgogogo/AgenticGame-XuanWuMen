# 待优化清单

> 按优先级组织，同一区块内按重要性从上到下。勾选完成的条目保留一段时间以便追溯，超过两个版本再清理。

---

## P0 · 玩法核心（优先级最高）

> 核心问题：当前纯阅读+自由输入的交互门槛高、参与感弱。
> "玩法 > 扩故事线 > 扩人物"——内容量已够验证体验，玩法不好玩加再多内容也没用。

### 策略选项按钮化

- [ ] **ActionPanel 改为"按钮优先 + 自由输入兜底"** — 把 LLM 返回的 `suggestedActions`（已有字段）从提示文字升级为一等公民的可点击按钮。玩家做的是"决策"而非"编剧"
- [ ] **选项设计为态度/策略而非台词** — prompt 引导 LLM 生成如"果断表态""反问试探""沉默观察"这类策略方向，玩家选择后 LLM 生成得体的古文对话
- [ ] **保留自由输入入口** — 底部折叠或小按钮"✏️ 自己说..."，高级玩家仍可自由发挥

### 动作/肢体语言选项

- [ ] **扩展选项类型，增加非对话动作** — 如"🗡️ 拔剑摔在案上""🍷 端起酒杯一饮而尽""📜 展开地图指向玄武门""🚪 起身走向门口"
- [ ] **prompt 中区分 dialogue / action 两类 suggestedActions** — 让 LLM 每轮同时给出言语选项和动作选项

### NPC 施压 + 倒计时

- [ ] **NPC 主动逼迫玩家决策** — 关键时刻 NPC 直接发起质问，玩家必须回应（如："殿下——应是不应？"）
- [ ] **倒计时机制** — 高压场景加 10~15 秒倒计时，超时视为"沉默"，沉默本身也是一个有后果的选择
- [ ] **默认选择逻辑** — 超时后自动选择"沉默"并推进剧情，NPC 对沉默做出反应

### 情报/线索系统

- [ ] **引入情报元素** — 玩家收到密报、截获书信、查看地图等，需要判断和决策
- [ ] **情报交互** — 选择"信/疑/将计就计""给谁看/藏起来"等
- [ ] **新 UI 组件** — 情报卡片、线索面板等（工作量最大，放最后）

---

## P1 · 等待时间与加载体验

> 2026-04-20 用户反馈：事件触发串行 + 整体等待偏长，体验被切碎。

- [ ] **#4 事件加载慢 + 过场单调（扩写）** — 多层优化，综合降低单日 40-80 秒的等待：
  - **事件并行预生成**：`runWorldTick` 在发现新事件时**后台** kick `resolveEventInstance`，存为 `preloadedEventInstance`。玩家看日报的 2-3 秒就能预热完成，`enterEvent` 直接取用，跳过 LLM 阻塞。涉及：worldSimulator.ts, App.tsx
  - **超时兜底**：事件生成超过 20 秒直接用 skeleton fallback 变体（CLAUDE.md 里标注的"骨架 fallback 变体尚未实现"也要一并做），不再等 res2 重试
  - **SceneManager 启动预热**：同样模式，进入日报时后台 kick `SceneManager.startGame()` 的第一轮 LLM
  - **过场文案多样化**：按 `skeleton.category` 选不同 loading 文案（"有人匆匆来报……""步入宴厅，灯火辉煌……"等）
- [ ] **#7 "夜幕降临"增加文本多样性** — App.tsx handleEndDay 的 loading 文案换成通用文案池随机选取（"长安城的喧嚣渐渐远去……""今日之事暂告一段落……""暮鼓已响，坊门将闭……"）。涉及：App.tsx
- [ ] **免费 API 慢** — Gemini Flash Preview 免费层延迟高，切到付费 API（DeepSeek、Claude 等）速度会好很多

---

## P1 · 叙事质量与事件触发

- [ ] **#3 事态可选择不处理** — DailyBriefingScreen 加"按下不表"按钮，跳过事件但施加惩罚压力（+5 qinwangfu_desperation, +3 相关轴）。涉及：DailyBriefingScreen.tsx, worldSimulator.ts, App.tsx
- [ ] **#6 场景内 pill 优化** — eventGenerator prompt 中要求 suggestedActions 必须具体有画面感（如"拿起酒杯佯装饮酒""质问建成为何设宴"），而非抽象概念（如"观察局势"）。涉及：npcPromptBuilder.ts
- [ ] **#8 LLM 总是生成"突厥急报"** — 情报骨架 constraints 加"不要重复已出现的主题，来源要多样化"；buildEventGenerationPrompt 注入最近 3 条 eventLog summary 让 LLM 避免重复。涉及：intelligenceEvent.ts, npcPromptBuilder.ts

---

## P2 · 性能 / Token 消耗

- [ ] **精简 system prompt** — 角色描述压缩到关键信息（性格关键词+语言风格+核心目标），去掉详细技能分值、完整记忆列表、关系信任度数值等，预计减少 ~60% 输入 tokens
- [ ] **对话历史滑窗** — 只保留最近 N 轮原文（如 5 轮），更早的替换为摘要，避免 context 线性增长（当前 `llmMessages` 全量发送，无裁剪）
- [ ] **摘要压缩** — 每隔几轮用小模型将旧对话压缩成 200 字前情摘要，替换原始对话记录
- [ ] **角色信息按需注入** — system prompt 只放最小角色卡，某角色被提及/参与时再动态附带其详细背景
- [ ] **maxTokens 动态调整** — 结局阶段需要更多输出 token，普通回合可以用更少的
- [ ] **NPC 决策 prompt 合并** — 当前每个 NPC 每日独立调用一次 LLM（3 NPC = 3 次），可考虑合并为一次调用，让 LLM 一次性输出所有 NPC 的决策 JSON 数组，减少 2/3 的调用次数
- [ ] **promptBuilder.ts 输出审计** — `buildSystemPrompt` 有 1200+ 行代码，需要实测最终生成的 system prompt 字符数/token 数，建立基线，针对性裁剪冗余段落

---

## P2 · LLM 调用可靠性

- [ ] **模型自动降级/切换** — 主模型返回 429 限流或响应超时时，自动切换到备选模型（如 gemini-2.5-flash → gemma-4-31b-it），无需手动改 .env 重启。可在 .env 配置 fallback 模型列表
- [ ] **JSON 输出强制约束** — 部分模型支持 `response_format: json_object`，可减少格式错误
- [ ] **重试机制** — 网络失败或格式解析失败时自动重试 1-2 次，而非直接显示"连接中断"
- [ ] **流式渲染** — 当前等完整响应才显示，后续可做流式 JSON 增量解析，先显示旁白再逐条显示 NPC 对话

---

## P3 · 下一版本内容

- [ ] **#10 主动发起多日任务** — 新增 Mission 类型，activeMissions 加入 WorldState，3-4 个"策略"类活动创建 Mission 而非即时效果，runWorldTick 每日推进进度。涉及：world.ts, worldSimulator.ts, activities.ts, DailyActivityScreen.tsx

---

## P3 · 部署与基础体验

- [ ] **前后端分离** — 当前前后端耦合，上线前拆为独立前端（React SPA）+ 后端（API 服务），便于独立部署、扩缩容和 CDN 加速
- [ ] **移动端适配** — 检查小屏幕下的布局、字体大小、触控交互
- [ ] **对话打字机效果** — 解析完 JSON 后逐字/逐条动画显示，而非一次性全部出现
- [ ] **音效/氛围** — 背景音乐、按钮音效等沉浸感增强

---

## ✅ 已解决（保留追溯，v3.3+ 清理）

- [x] **#12 跨场景对话记忆** — handleEventEnd 后用 LLM 提取关键对话/承诺存入 `WorldState.characterMemories`，下次场景 system prompt 注入。涉及：world.ts, worldSimulator.ts, sceneManager.ts, promptBuilder.ts
