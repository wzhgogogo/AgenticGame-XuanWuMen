# 玄武门之变 — LLM 驱动的历史互动叙事游戏

v3.4.5.1

## 简介

武德九年，正月至六月。玩家扮演秦王李世民，在涌现式世界模拟中经历从暗流涌动到最终摊牌的半年博弈。秦王府三人（长孙无忌、尉迟敬德、房玄龄）与对立方三人（太子建成、齐王元吉、皇帝李渊）皆为完整 NPC，每日自主决策。

没有固定剧情线——7 条压力轴驱动世界运转，6 个核心 NPC 作为自主 Agent 每日决策，事件从利益冲突的压力积累中自然涌现。即便是玄武门之变本身，也可能因为玩家的选择而不发生。

## 技术栈

- React 19 + TypeScript + Vite 8
- Tailwind CSS v4
- Bun 运行时
- LLM：OpenAI 兼容接口（支持 OpenAI / Anthropic / DeepSeek / Moonshot / 通义千问 / 智谱）

## 快速开始

```bash
# 安装依赖
bun install

# 配置 LLM（编辑 .env）
cp .env.example .env
# 填入你的 API key 和模型名

# 启动开发服务器
bun run dev
```

### .env 配置说明

```env
VITE_LLM_PROVIDER=openai          # 可选：openai / anthropic / deepseek / moonshot / qwen / zhipu
VITE_LLM_API_KEY=your_api_key     # API 密钥
VITE_LLM_MODEL=gemini-2.5-flash   # 模型名称
VITE_LLM_BASE_URL=                # 自定义 API 地址（留空则使用 provider 默认地址）
```

## 事件骨架

v3.0 起不再有固定场景序列。以下 11 种事件骨架由压力系统驱动涌现，每条骨架支持 4 档 outcome（success / partial / failure / disaster），LLM 在场景结束时选定 outcome，对应剥夺 NPC / 官职 / 兵权 / 置 flag 等：

| 骨架 | 触发条件举例 | 说明 |
|------|-------------|------|
| 宴会危局 | 建成敌意 ≥ 70 | 社交场合暗藏杀机，可涌现为"东宫鸩酒""猎场伏弓"等变体 |
| 政治对抗 | 朝堂舆论 ≥ 65 | 弹劾攻势、舆论战 |
| 暗杀危机 | 建成 ≥ 80 且元吉 ≥ 70 | 物理暗杀或伏击 |
| 部下逼宫 | 秦王府急迫 ≥ 75 且 NPC patience 低 | 核心幕僚逼迫秦王决断 |
| 皇帝召见 | 李渊猜疑 ≥ 60 或储位危机 ≥ 80 | 面圣训话、调停、问责 |
| 情报事件 | 储位危机 ≥ 45（day ≥ 5） | 密报传来、间谍暴露 |
| 盟友离心 | NPC 信任低 + 急迫感高 | 关键人物动摇或叛离 |
| 军事冲突 | 军事准备 ≥ 40 且储位危机 ≥ 85 | 最终武力对抗（游戏高潮） |
| 朝堂构陷罢黜 | 建成敌意 ≥ 60 + 朝堂舆论 ≥ 50 | 太子奏请罢免秦王府属官，灾难掉多职 |
| 朝堂主动反击 | 已被严重弹劾 + 秦王府急迫 ≥ 55 | 玄龄/无忌密议反击三路（正面/外援/后宫），失败反成把柄 |
| 夺兵权请缨 | 突厥犯边 + 元吉野心 ≥ 60 | 元吉奏请代北征调走秦王府精兵，失败兵权 ceiling -30 |

## 人物

### 玩家角色

**李世民** · 秦王 · 28 岁
大唐天策上将，雄才大略却被迫走向夺嫡之路。以"孤"自称，果决隐忍，重情义，杀伐果断。

### 核心 NPC

| 人物 | 身份 | 定位 | 性格 | 语言风格 |
|------|------|------|------|---------|
| 长孙无忌 | 秦王府参军 | 深沉多谋的妻兄 | 谨慎、忠诚、政治嗅觉敏锐 | 沉稳雅致，引经据典，以"臣"自称 |
| 尉迟敬德 | 右一府统军 | 铁血忠义的猛将 | 刚烈、直言不讳、行动派 | 粗犷豪迈，简短有力，以"末将"自称 |
| 房玄龄 | 记室参军 | 温和周密的谋臣 | 深思熟虑、温和、面面俱到 | 温文尔雅，条理清晰，以"臣"自称 |

### 人物关系与称谓

游戏内置完整的称谓映射规则，确保 LLM 生成的对话符合历史身份：

- NPC 称皇帝李渊→"陛下" / 称太子→"太子殿下" / 称齐王→"齐王"
- 李世民称李渊→"父皇" / 称建成→"大哥" / 称元吉→"四弟" / 称李神通→"叔父"
- 配角须符合历史身份，皇族不可出现跪求等不合身份的描写

## 项目结构

```
src/
├── types/
│   ├── index.ts                  # 全局类型定义
│   └── world.ts                  # v3.0 世界模拟类型（压力、事件、NPC Agent、活动）
├── data/
│   ├── characters/               # 角色数据（一人一文件）
│   │   ├── liShimin.ts           # 李世民（玩家）
│   │   ├── changSunWuji.ts       # 长孙无忌
│   │   ├── weiChiJingDe.ts       # 尉迟敬德
│   │   ├── fangXuanLing.ts       # 房玄龄
│   │   ├── memoryLoader.ts       # 记忆加载（Markdown → MemoryEntry）
│   │   └── memories/             # 各角色基础记忆（.md 文件）
│   ├── skeletons/                # 事件骨架模板（8 种事件类型）
│   │   ├── banquetCrisis.ts      # 宴会危局
│   │   ├── politicalConfrontation.ts  # 政治对抗
│   │   ├── assassinationCrisis.ts     # 暗杀危机
│   │   ├── subordinateUltimatum.ts    # 部下逼宫
│   │   ├── imperialSummons.ts    # 皇帝召见
│   │   ├── intelligenceEvent.ts  # 情报事件
│   │   ├── allyWavering.ts       # 盟友离心
│   │   ├── militaryConflict.ts   # 军事冲突
│   │   └── index.ts
│   ├── agents/                   # NPC 行为规则
│   │   ├── npcDecisionRules.ts   # 每角色确定性规则
│   │   └── offstageAgents.ts     # 建成/元吉/李渊 每日压力
│   ├── scenes/                   # v2.0 场景配置（保留作参考）
│   └── timelines/                # v2.0 时间线（已废弃）
├── engine/
│   ├── llm/                      # LLM 适配器层（Registry 模式）
│   ├── world/                    # v3.0 世界模拟引擎
│   │   ├── worldSimulator.ts     # 核心模拟循环（替代 CampaignManager）
│   │   ├── worldState.ts         # 状态初始化 + localStorage 存档
│   │   ├── pressure.ts           # 压力系统（tick / modifier / trigger）
│   │   ├── calendar.ts           # 武德九年农历日历
│   │   ├── npcAgent.ts           # NPC Agent 决策引擎
│   │   ├── npcPromptBuilder.ts   # NPC 决策紧凑 prompt
│   │   ├── eventGenerator.ts     # 骨架 → LLM 变体生成
│   │   ├── eventRunner.ts        # EventInstance → SceneManager 适配
│   │   └── activities.ts         # 日常活动效果
│   ├── promptBuilder.ts          # System prompt 组装
│   ├── sceneManager.ts           # 单场景引擎（复用）
│   ├── campaignManager.ts        # v2.0 多场景编排（已废弃）
│   └── outcomeBuilder.ts         # 场景结果提取
├── components/
│   ├── SceneBackground.tsx      # 5层电影感场景背景（渐变+色调+烛光+噪点+暗角）
│   ├── DialoguePanel.tsx        # 单条对话展示面板（毛玻璃+翻页）
│   ├── DailyActivityScreen.tsx   # 日常活动选择界面（书桌风格布局）
│   ├── DailyBriefingScreen.tsx   # 当日汇报界面
│   ├── WorldStateHud.tsx         # 压力定性展示
│   ├── desk/
│   │   ├── DeskLayout.tsx        # 案台视觉容器（背景/暗角/烛光/地图/压力面板/时段按钮）
│   │   ├── DeskObject.tsx        # 案台物件交互（点击展开活动卡片）
│   │   └── FlavorTextOverlay.tsx  # 活动文案浮层
│   ├── NarratorPanel.tsx         # 顶部场景信息栏（已不再被 GameScene 引用）
│   ├── DialogueFlow.tsx          # 滚动消息流（已被 DialoguePanel 替代）
│   ├── ActionPanel.tsx           # 底部操作面板（2列卡片式）
│   ├── EndingScreen.tsx          # 结局画面
│   ├── TransitionScreen.tsx      # 场景过渡画面
│   └── GameScene.tsx             # 游戏场景容器（全屏+浮动面板布局）
├── App.tsx                        # 入口：状态机驱动游戏流程
└── index.css                      # 全局样式（古风配色 + 字体 + 动画）
```

## 架构设计

### 世界模拟层
- **WorldSimulator**：核心模拟循环，管理 title_screen → daily_activities → daily_briefing → event_scene → game_over 状态机
- **压力系统**：7 轴压力引擎，每日 tick（velocity + decay towards baseline），支持 floor/ceiling 约束
- **NPC Agent**：两阶段决策管线（确定性规则过滤 → LLM 推理），每角色独立 patience/alertness/commitment 状态，多 NPC 并行决策（Promise.all）
- **幕后 Agent**：建成/元吉/李渊 纯确定性每日压力贡献，不消耗 LLM token
- **事件生成器**：骨架模板定义结构 + LLM 生成具体变体，同一骨架在不同世界状态下产生不同事件
- **跨场景记忆**：场景结束后 LLM 提取 NPC 记忆（memoryExtractor），持久化到 WorldState.characterMemories，注入后续 NPC 决策和场景对话 prompt

### 引擎层
- **SceneManager**：单场景状态机 + 观察者模式，管理对话循环、阶段推进、结局触发
- **PromptBuilder**：纯函数构建 System Prompt，包含角色三层记忆（基础/短期/反思）、称谓规则、输出格式约束
- **约束中枢**（promptConstraints.ts）：所有 LLM prompt 约束的唯一来源，两层设计——历史事实层（人物表/称谓/禁用词，不变）+ 叙事节奏层（烈度约束，随压力值动态变化）。消费方通过 `buildConstraintBlock()` 统一获取
- **OutcomeBuilder**：启发式提取场景结果（关键决策识别 + 关系变化估算）

### 数据层
- **角色系统**：Big Five 人格模型 + 三层记忆 + 关系网络（信任度 0-100）+ 语言风格约束
- **骨架模板**：8 种事件类型，每种定义阶段框架、触发条件、约束、收束规则
- **日常活动**：5 类 12 项，各有压力效果和场景文案

### LLM 适配
- Registry 模式，支持 6 家 LLM 提供商
- SSE 流式接收
- JSON 可靠解析：括号计数提取 + 截断修补 + 文本格式 fallback

### 测试与评估
- 单测 220 用例（vitest）：覆盖压力系统、日历、NPC Agent、骨架模板、事件生成/适配、prompt 构造
- 自动跑局脚本（autoplay.test.ts）：随机活动 + 随机玩家输入，收集 LLM 输出日志，内置 RPM 限速器
- Eval 框架（规划中）：量化指标 + LLM-as-Judge 半自动评估

---

## 开发日志

### v1.0 — 2026-04-12

从零搭建项目，完成单场景 MVP。

**引擎层**
- 搭建 React + TypeScript + Vite + Tailwind CSS v4 项目骨架
- 实现 SceneManager：状态机 + 观察者模式，管理 intro → playing → ending 生命周期
- 实现 PromptBuilder：纯函数组装 System Prompt，包含角色描述、场景信息、输出格式约束
- 实现 LLM 适配器层：Registry 模式 + OpenAI 兼容适配器 + Anthropic 适配器 + SSE 流式解析
- 注册 6 家 LLM 提供商（OpenAI / Anthropic / DeepSeek / Moonshot / 通义千问 / 智谱）

**角色系统**
- 设计 CharacterCore 类型：Big Five 人格模型 + 技能 + 关系网络（信任度 0-100）+ 语言风格（register / patterns / never）
- 创建 4 个角色文件：李世民（玩家）、长孙无忌、尉迟敬德、房玄龄

**场景与 UI**
- 创建午夜密议场景（scene_midnight_council）：3 阶段（危机揭示 → 激辩定策 → 最终决断），10-15 回合
- 实现 5 个 UI 组件：NarratorPanel、DialogueFlow（4 种对话类型渲染）、ActionPanel（预设 + 自由输入）、EndingScreen、GameScene
- 古风视觉风格：米色纸张配色、Noto Serif SC 字体、思考中动画

**可靠性修复**
- JSON 提取器：括号计数精确提取 + 截断修补 + markdown 代码块兼容 + 文本格式 fallback
- 结局触发：硬触发（回合数）+ 软触发（语义识别玩家决断意图，>=5 轮即可）
- maxTokens 调至 4096 防止 JSON 截断
- 对话滚动优化（仅 entryCount 变时触发）
- 错误信息透出具体 LLM 错误原因

### v2.0 — 2026-04-14

从单场景扩展为完整武德九年时间线，新增多场景编排引擎和记忆系统。

**时间线引擎**
- 新建 CampaignManager：多场景编排，管理 not_started → in_scene → transitioning → completed 状态流转
- 新建 OutcomeBuilder：启发式提取场景结果（关键决策识别 + NPC 关系变化估算）
- 新建 TimelineConfig 和 SceneTransition 类型，支持场景编排 + 过渡叙事
- 实现跨场景记忆传递：SceneOutcome → shortTermMemory + relationshipDeltas → 注入下一场景 System Prompt

**6 场景时间线**
- 新建场景 1：暗流涌动（正月·秦王府）— 派张亮赴洛阳，张亮被告下狱
- 新建场景 2：东宫鸩酒（二月·东宫）— 建成设宴毒酒，元吉李神通在场
- 新建场景 3：洛阳之议（三月·秦王府）— 陛下欲遣世民赴洛阳，去留抉择
- 新建场景 4：围困削权（四五月·秦王府）— 弹劾攻势 + 突厥犯边夺兵
- 改造场景 5：太白经天（六月初一·朝堂）— 新增面圣对峙阶段，补充反告后宫
- 保留场景 6：午夜密议（六月初三夜·秦王府）— 不动
- 编写 5 条场景过渡叙事，串联完整时间线
- 新建 TransitionScreen 组件

**记忆系统**
- 新建 memoryLoader.ts：Vite 静态导入 + Markdown 解析 → MemoryEntry
- 为 4 个角色各创建 foundational.md 基础记忆文件
- Character 类型扩展：foundationalMemory + shortTermMemory + reflections 三层记忆

**Prompt 优化（测试反馈驱动）**
- 称谓规则：从 5 行简单禁令扩展为完整人物关系表（正式称谓 + 亲属称呼 + 皇族互称 + 配角行为规范）
- 输出格式：characterId 从 `"npc的id"` 改为列出具体可选值（`changsun_wuji、weichi_jingde、fang_xuanling`），修复 NPC 名字显示为拼音的问题
- 结局触发 minTurns 统一为 5（方便测试）

**场景合理性修正（测试反馈驱动）**
- 场景 1（暗流涌动）移除尉迟敬德 — 政治密谋场景武将不参与
- 场景 3（洛阳之议）地点从太极宫改为秦王府·书房，移除敬德
- 场景 2（鸩酒）补充元吉在场 + 李神通宗室重臣身份说明
- 确认太白经天场景不涉及王晊（避免与后续过渡叙事矛盾）

### v3.0 — 2026-04-15

从固定 6 场景线性序列升级为涌现式世界模拟。事件不再按脚本触发，而是从 NPC 利益冲突的压力积累中自然涌现。

**压力系统（替代固定场景触发）**
- 新建 7 条压力轴（储位危机、建成敌意、元吉冒进、朝堂舆论、秦王府急迫、李渊猜疑、军事准备），各轴 0-100，带 velocity / baseline / floor / ceiling / decayRate
- 三通道压力变化：时间漂移（确定性每日 tick）、NPC 行为（agent 决策）、玩家行为（日常活动 + 事件选择）
- 历史"引力"来自 NPC 性格参数，不来自硬编码脚本——建成的高 baseline 敌意意味着如果玩家不作为，局势会自然升级到触发鸩酒/暗杀；但持续化解可让这些事件永远不发生

**事件系统：骨架模板 + LLM 变体生成**
- 新建 8 个事件骨架模板（宴会危局、政治对抗、暗杀危机、部下逼宫、皇帝召见、情报事件、盟友离心、军事冲突）
- 骨架定义事件类型结构（阶段框架、触发条件、约束、收束定义），LLM 根据当前世界状态生成具体变体（名称、地点、NPC 分配、阶段文案）
- 同一骨架在不同压力状态下生成不同变体：宴会危局在建成敌意 78 时可能是"东宫鸩酒"，元吉冒进 85 时可能是"猎场伏弓"
- 场景自然收束：取消硬性轮次计数和关键词匹配，改为基于核心悬念解决的语义收束（softCap 引导 + hardCap 兜底）

**NPC Agent 架构**
- 每个 NPC 每日运行两阶段决策：确定性规则过滤 → LLM 推理（~300 token 紧凑 prompt）
- NPC Agent 状态：patience / alertness / commitment，每日自然衰减
- 3 个幕后 Agent（建成、元吉、李渊）：纯确定性每日压力贡献，不消耗 LLM token
- 涌现式事件举例：尉迟敬德 patience 每日 -2，当 patience < 15 且秦王府急迫 ≥ 75 → 触发"部下逼宫"骨架

**日常活动层**
- 每天 3 个时间段（晨/午/夜），玩家每段选一个活动
- 5 类 12 项活动：治政、军务、情报、社交、个人，各有不同压力效果
- 活动选择时间掩盖后台 NPC agent LLM 调用延迟

**前端状态机重写**
- 新状态机：title_screen → daily_activities → daily_briefing → [event_scene] → daily_activities → ... → game_over
- 新增 3 个组件：DailyActivityScreen（日常活动选择）、DailyBriefingScreen（当日汇报 + 事件预告）、WorldStateHud（压力定性展示）
- App.tsx 用 WorldSimulator 替代 CampaignManager
- 加载过渡画面掩盖异步 tick 延迟

**存档系统**
- localStorage 自动存档（事件场景中不存，避免中间状态）
- 开屏支持"继续游戏"/"新游戏"
- 世界状态完整序列化/反序列化

**废弃**
- CampaignManager（被 WorldSimulator 替代）
- 固定时间线 xuanwuGate.ts
- 固定场景序列（保留场景数据作为参考）

### v3.1 — 2026-04-17

用户测试反馈驱动的节奏优化与结局体系。

**节奏加速**
- 压力轴 velocity 全线翻倍（military_readiness 除外），事件触发速度提升一倍
- 去掉 4 个骨架的 minDay 限制（宴会危局、政治对抗、皇帝召见、盟友离心），事件触发完全靠压力阈值
- 情报事件 minDay 从 5 降至 2，军事冲突保留 minDay: 60
- 游戏时间上限从 month > 8 缩短至 month > 6

**结局体系（5 种结局）**
- 兵变成功（military_readiness ≥ 50 + 军事冲突完成）：历史正轨，秦王登基
- 兵变失败→被擒（readiness < 30 + 军事冲突完成）：大势已去
- 兵变失败→内战→胜利（readiness ≥ 30 + 军事冲突完成）：退守反攻，惨胜登基
- 隐忍→被废（时间到或关键压力 ≥ 95）：建成得势，秦王出局
- 隐忍→兄弟和好（时间到 + hostility < 30 + crisis < 40）：极难达成的和平结局
- EndingScreen 重写，每种结局有独立标题和叙述文案

**日报去重**
- 修复日报画面 NPC narrativeHook 重复显示问题（briefing 文本和"府中动态"卡片各显示一遍）
- buildDailyBriefing 只保留日期头 + 事件预告，NPC 动态交给组件独立渲染

**活动文案扩充**
- 12 个日常活动的 flavorTexts 从每个 2-3 条扩充至约 50 条，大幅减少重复感
- 文案覆盖：政务、军事、情报、社交、个人五大类，风格多样（紧张/日常/反思）

**骨架优化**
- 情报骨架描述修复（病句修正）
- 多个骨架描述精简，去掉冗余的破折号后缀

### v3.2 — 2026-04-19

跨场景角色记忆系统 + 架构规范强化。

**跨场景记忆（#12）**
- 新建 memoryExtractor.ts：场景结束后用一次 LLM 调用（~200-300 tokens）从对话摘要中提取每个参与 NPC 的关键记忆（承诺、冲突、情感变化）
- WorldState 新增 `characterMemories: Record<string, MemoryEntry[]>`，记忆随存档持久化，新开一局自动清空
- worldSimulator.ts handleEventEnd 中 fire-and-forget 调用记忆提取，不阻塞游戏流程
- 提取结果同步到 Character.shortTermMemory，promptBuilder 场景对话自动注入近期记忆
- npcPromptBuilder 注入最近 5 条角色记忆到每日决策 prompt，NPC 决策不再只看压力数字
- 每角色记忆上限 10 条，超出时保留最新
- restoreGame 兼容旧存档（characterMemories 缺失时补空）

**构建修复**
- 修复 eventGenerator.test.ts 中 pressureSnapshot 类型错误（`{}` → 完整 7 轴快照），npm run build 恢复通过

**架构规范升级（arch-guard skill）**
- 新增防膨胀规则：文件 ≤300 行、函数 ≤50 行、参数 ≤5 个、禁止预设式开发
- 新增代码卫生规则：死代码必删、注释只写 WHY、禁止 any、LLM 返回必须验证
- 新增 LLM 调用规则：prompt 与调用分离、失败静默、不阻塞 UI、标注 token 量
- 新增状态管理规则：状态集中 WorldState、单向数据流、存档兼容性
- 项目结构更新为 v3.0 实际目录
- 自检清单从 6 项扩充到 12 项（分层 + 体积 + 卫生 + 安全四维）

### v3.3 — 2026-04-19

电影叙事风美术重构 Sprint 1：视觉骨架搭建。

**布局重构**
- 所有屏幕从 flex 分段式布局改为全屏场景 + 浮动面板结构
- 不使用 letterbox 遮幅，改用 vignette 暗角模拟电影感（保留垂直空间给文字）

**场景背景系统**
- 新建 SceneBackground 组件：5 层叠加（CSS 径向渐变底色 + 阶段色调滤镜 + 烛光呼吸动画 + SVG feTurbulence 噪点 + vignette 暗角）
- 3 阶段色调自动切换：冷靛蓝（危机揭示）→ 暖琥珀（激辩定策）→ 深红金（最终决断），3s ease 过渡
- 全部纯 CSS 实现，无真实图片依赖，可降级

**对话系统改造**
- 新建 DialoguePanel 组件，替代 DialogueFlow 滚动消息流
- 改为单条对话展示 + 翻页浏览（空格/方向键/点击），`[当前/总数]` 进度指示
- 毛玻璃面板（glass-panel：`rgba(10,10,15,0.85)` + `backdrop-filter: blur(12px)`）
- 括号内动作描写自动渲染为斜体灰色
- 旁白模式：无面板框，居中大字 + 金色分隔线装饰

**交互卡片化**
- ActionPanel 从横排按钮改为 2 列网格卡片
- 深色底 + 金色细边框，hover 时边框亮起 + `scale(1.02)` 微放大

**标题画面**
- 电影海报式重设计：Ma Shan Zheng 书法字体标题 + 金色 text-shadow 发光
- 渐变金色分隔线 + `letter-spacing: 0.3em` 副标题
- Stagger 入场动画序列（标题 → 副标题 → 分隔线 → 按钮，各延迟 0.5s）
- 所有按钮改为透明底 + 金色边框 + hover 发光

**全局视觉统一**
- 所有屏幕（日常活动、日报、过场、结局、加载、错误）统一 SceneBackground + 金色边框按钮风格
- index.css 新增书法字体类、烛光呼吸动画、毛玻璃通用样式
- `prefers-reduced-motion` 降级：关闭所有动画

### v3.4 — 2026-04-19

LLM prompt 约束集中化 + NPC 并行决策 + 自动化测试基础设施。

**约束系统重构**
- 新建 promptConstraints.ts 作为 LLM prompt 约束中枢，统一管理历史事实层（人物表、禁用词）和称谓规则
- 导出 `buildConstraintBlock(dateStr, intensityConstraint, detailed?)` 统一拼装约束，消费方不再各自拼字符串
- promptBuilder.ts / npcPromptBuilder.ts / eventRunner.ts 全部改为引用 promptConstraints.ts
- 删除旧的 historicalConstraint.ts（内容合并到 promptConstraints.ts）

**NPC 决策并行化**
- worldSimulator.ts 的 `runWorldTick()` 中 NPC 决策从串行改为 `Promise.all` 并行
- 分三阶段：确定性规则过滤（串行）→ LLM 决策（并行）→ 结果合并（串行）
- 3 个 NPC 的日决策延迟从 ~3x 降为 ~1x

**自动化测试基础设施**
- 新建 autoplay.test.ts 自动跑局脚本：vitest 驱动，mock localStorage，随机活动 + 随机玩家输入，实时 flush JSON 日志
- 玩家输入池 6 类（观望/散场/决断/消极/对抗/申辩），随机打散
- 内置滑动窗口速率限制器（RPM_LIMIT=13），适配 Gemini 等低频 API
- ⚠️ **已知问题**：约束重构后 autoplay 脚本在 vitest 中运行不稳定（`Cannot read properties of undefined (reading 'config')`），疑似 vitest Windows 环境下模块加载竞争问题，待排查

**单测补全**
- 新增 skeletons.test.ts（77 用例）：批量验证 8 种骨架模板结构 + 关键业务值
- 新增 eventGenerator.test.ts（13 用例）：事件生成 mock LLM 测试
- 新增 eventRunner.test.ts（9 用例）：EventInstance → SceneConfig 适配测试
- 新增 npcPromptBuilder.test.ts（14 用例）：NPC 决策 prompt 构造测试
- 全量 220 用例通过

**Eval 框架（第一版方案）**
- 新建 .claude/skills/eval/ 评估 skill：读取 autoplay 日志，计算量化指标 + LLM-as-Judge 半自动评估
- 待 autoplay 稳定后启用

### v3.4.1 — 2026-04-20

叙事结局安全网 + NPC 决策修复 + 叙事约束补齐 + 引擎目录清理。

**叙事结局安全网**
- worldSimulator.ts 新增 `detectNarrativeEnding(summary)` 正则检测：事件结局文本含终结性关键词（幽禁/囚禁/斩首/处死/流放/削爵等）时直接触发 game over
- 匹配要求主语含"秦王/李世民/世民"，避免误匹配 NPC 遭遇
- 叙事检测优先于机械检测（压力阈值/骨架类型），零 token 开销
- 修复了 autoplay 中 Day 2 "秦王被幽禁"但游戏继续推进 27 天的 bug

**NPC 决策修复**
- 修复 100% NPC 决策降级问题：prompt 中世界状态显示中文标签但 normalizeIntent 期望英文 axisId，导致所有 pressureDeltas 被丢弃
- npcPromptBuilder 世界状态行增加英文 ID、白名单提示改纯英文 ID、JSON 示例用具体英文 ID
- NPC 压力白名单调整：尉迟敬德增加 jiancheng_hostility，三人职能分化更明确

**叙事 prompt 约束补齐**
- buildSystemPrompt 输出格式段追加 3 条写作规则：禁未来事件、白描史书体、称谓不混用
- buildMessages 结局 prompt 注入当前游戏日期，防止 LLM 在一月就写出六月的事件
- 结局硬性约束：禁止出现玄武门之变/登基/即位/贞观/太宗，禁止时间跳跃

**引擎目录清理**
- 删除废弃文件：campaignManager.ts、outcomeBuilder.ts、__test__promptBuilder.ts
- promptBuilder.ts 从 engine/ 根移至 engine/world/，与 npcPromptBuilder.ts 同级
- 7 个测试文件迁入 engine/world/__tests__/，源码目录更清爽

**Autoplay 扩展**
- MAX_DAYS 从 15 提升到 30，超时从 30 分钟提升到 60 分钟
- 成功跑完全程（136 条日志，~28 分钟）

### v3.4.2 — 2026-04-22

NPC stance 精细化 + Eval 检测强化 + 自动跑局策略化。

**NPC Stance 拆分（8 → 19）**
- 原 8 个粗粒度 stance（observe/persuade/confront 等）拆分为 19 个细粒度 stance，区分文臣与武将行为模式
- 情报类：observe（观望）、plant_spy（安插探子）、counterspy（反间）、analyze（应急研判）
- 文臣类：advise（进言）、remonstrate（死谏）、lobby（游说外部）、scheme（对内串联）、coordinate（对外联络）、strategize（全局谋划）
- 武将类：drill（练兵）、rally（激励部下）、patrol（巡防）、pressure（武力威慑）、defy（公然抗命）、assassinate（暗杀）、capture（抓捕）
- 极端类：breakdown（崩溃）、abandon（弃主）
- 5 档 pressure cap 系统：极端行动允许更大压力变化（±8），观望类行动严格限制（±3）
- 三个 NPC 决策规则全面重写，每人 4-5 个规则档位覆盖不同紧迫度场景

**Eval 检测强化（P1 优先）**
- 禁用词从 12 个扩充到 28 个（补充：继位/登极/新君/践祚/凌烟阁/贞观之治/杀兄/杀弟/鸩酒/兵变成功/夺位等）
- 称谓规则从 2 条扩充到 6 条（新增：NPC 直呼李世民姓名、李渊姓名、太子齐王亲属称呼、后世称谓）
- 新增虚构事件检测（fabricated_event）：4 条引用性表达模式（"昨日刺杀""上次宴会"等），与 eventLog 交叉校验
- 新增人设一致性检测（persona_violation）：长孙/房玄龄反人设关键词（拔剑/暴怒/大骂），尉迟反人设关键词（隐忍/迂回/婉转/试探/缓缓）
- 输出按 P1（历史跳跃/称谓/虚构/人设）和 P2（重复/记忆）分优先级展示

**自动跑局策略化**
- autoplay 新增 `AUTOPLAY_STRATEGY` 环境变量，支持切换策略（suppress_emperor / suppress_jiancheng / balanced 等）
- RPM 限制支持 `AUTOPLAY_RPM` 环境变量动态配置


### v3.4.3 — 2026-04-24

记忆系统升级 + 玩家行为日志 + Prompt 增强 + 事件预取 + LLM 缓存 + 早中晚光照 + Demo 视觉合并。

**记忆系统升级**
- memoryExtractor 新增 `relationshipDeltas` 输出：场景结束后提取角色间信任度变化（-10~+10）
- WorldState 新增 `characterLongTermSummary`：短期记忆超 15 条时 LLM 提炼旧记忆为浓缩摘要，永久累加
- WorldState 新增 `relationshipOverrides`：运行时信任度修正（累计 clamp -60~+60），与静态 trust 叠加后 clamp 0-100
- `selectMemories()` 按 importance 排序 + 最近 N 条保底，避免无差别堆砌
- 超阈值自动压缩：importance 排序截断 + LLM 摘要淘汰部分

**玩家行为日志**
- 新增 `PlayerAction` 类型：记录活动选择 / 事件结局 / 按下不表（滑窗 30 条）
- NPC 决策 prompt 注入"秦王近日行踪"（最近 5 天行为），让 NPC 感知玩家做过什么
- 场景对话 prompt 也注入玩家近期行为

**Prompt 增强**
- NPC 决策注入长期记忆摘要 + 态度变化（有效信任度 = 静态 + delta + 近期原因）
- 场景对话中角色关系段合并 relationshipOverrides，显示信任变化和原因
- SceneManager 传递 relationshipOverrides / recentPlayerActions 给 promptBuilder

**事件生成优化**
- eventGenerator 改用 `callLLMWithRetry` + 禁用词校验 + JSON 结构校验（替代手动重试）
- worldSimulator 新增事件变体预取：briefing 期间后台启动生成，进入事件场景时直接 await

**LLM 接口增强**
- LLMMessage 新增 `cacheBoundary` 字段
- Anthropic provider 支持 prompt cache：系统 prompt 前缀注入 `cache_control: { type: 'ephemeral' }`

**PixiJS 渲染层：早中晚光照区分**
- BackgroundLayer 新增 `setTimeSlot()`：案台 overlay 颜色和暗角强度按时段变化（晨-冷蓝淡 / 午-暖棕中 / 夜-深暗浓）
- AtmosphereLayer 新增 `setTimeSlot()`：烛光和光束颜色、位置、亮度按时段区分（晨-自然光束亮烛光暗 / 午-均衡 / 夜-烛光亮光束消）
- DeskContentLayer 光斑差异增大：晨-冷蓝右上 / 午-暖黄正上 / 夜-暖橙左侧
- GameCanvas 将 timeSlot 传递给所有渲染层

**Demo 视觉风格合并到正式游戏**
- 新建 DeskLayout.tsx：从 VisualDemoScreen 提取视觉组件（desk.png 桌面背景、暗角层、烛光层、长安地图+秦王印章、石碑式时段按钮、真实压力数据面板）
- DailyActivityScreen 完全重写布局：绝对定位 + 深色卡片式活动面板 + 中央地图 + 底部石碑按钮，保留全部交互逻辑
- CSS 层 TIME_LIGHTING 三时段配置驱动暗角/烛光/色调变化

**入口清理**
- main.tsx 移除 VisualDemoScreen 和 DeskDemo 分支，统一走 App
- 废弃：VisualDemoScreen.tsx、DeskDemo.tsx、ImperialDesk.tsx、ChangAnMap.tsx（SVG 版）


### v3.4.4 — 2026-04-26

三 NPC 升级：建成 / 元吉 / 李渊从幕后 Agent 升级为完整 NPC，可在事件场景中作为对话角色出场。

**升级动机**
- 原三人作为 offstageAgents 仅贡献确定性每日压力，无法在 banquetCrisis / imperialSummons / assassinationCrisis 等骨架场景中作为活跃 NPC 出场
- 升级后三人与秦王府三人享有同等的 LLM 决策与对话能力，世界更动态

**新增数据**
- src/data/characters/{liJianCheng,liYuanJi,liYuan}.ts — 完整 Character（Big Five / speechStyle / relationships / goals）
- src/data/characters/memories/{li_jiancheng,li_yuanji,li_yuan}/foundational.md — 各 6 条历史基线记忆
- 李元吉 internalConflict 显式刻画"表面助大哥实则二虎相争"动机
- 李渊 longTerm 显式刻画"挑动诸子相争以坐稳帝位"的帝王心术

**决策规则**
- 李建成：daily / active (jiancheng_hostility ≥50) / aggressive (succession_crisis ≥60) / decisive (succession_crisis ≥80, assassinate)
- 李元吉：daily / active / aggressive / assassin / **fishing**（jiancheng_hostility ≥70 且 qinwangfu_desperation ≥60 启动二虎相争）
- 李渊：daily / balance / suspicious / imperial / **balance_act**（双方压力都高时挑动较弱方，避免一方独大）

**配套变更**
- offstageAgents.ts 改为空数组，文件保留作占位，等待补充秦叔宝 / 程咬金 / 魏征等其他历史人物
- promptConstraints.ts 紧凑版称谓规则补齐：建成称世民"二郎/秦王"、元吉称"二哥/秦王"，禁用"殿下"
- worldState.ts DEFAULT_NPC_AGENT_CONFIGS 新增三人初始 patience / alertness / commitment

**影响**
- 每日 LLM 调用从 3 次增至 6 次（Promise.all 并行）；付费档延迟 +30-50%，免费档因 RPM 限制可能 3-4×
- prompt token 增加，建议保持 v3.4.3 的 Anthropic prompt cache
- 302 单测全过

---

**结局系统重写**

锁定 5 结局光谱（保留原 EndingType 字面量，不重命名），玩家终于"输得起"——事件 outcome 不再仅改压力数值，可真正剥夺 NPC、官职、兵权。

- E1 玄武门成功 / E3 惨胜 / F1 政治终局失败 / F5 武力发动失败 / N1 时光流逝
- 优先级链 F5 → E3 → E1 → F1 → 第 180 天 N1，在 src/engine/world/endingResolver.ts 中判定，**直接替换** 旧 checkGameOver
- 新类型 `OutcomeEffect`（discriminated union）：pressure / loseNpc / injureNpc / loseOffice / confiscateMilitary / flag。原 `PressureModifier` 保留不动以兼容
- `NpcAgentState.status`：'active' | 'exiled' | 'imprisoned' | 'deceased' | 'dispatched'，worldSimulator 在决策阶段统一过滤
- `WorldState.playerOffices`：5 官职（天策上将 / 尚书令 / 司空 / 雍州牧 / 左武卫大将军）。loseOffice 通过 militaryCeilingContribution 反向改写 military_readiness ceiling
- `src/data/flags.ts` FlagKey 白名单 + applyOutcomeEffects 强制校验
- `src/data/endings.ts` ENDING_LABELS 映射 EndingType → {code, name, description}，UI 与 evalPlaythrough 消费
- 存档兼容：migrateWorldState 自动补 status='active' / playerOffices / 旧 outcomeEffects wrap

**事件骨架结构化 + 新增 3**

让所有骨架支持多 outcome 分支。LLM 在场景结束 JSON 返回 `chosenOutcome ∈ {success, partial, failure, disaster}`，applyOutcomeEffects 据此筛 tagged outcome 全部生效。

- `SceneResolution.resolutionSignals` 改为 `ResolutionSignal[] = { outcome, description }`
- `EventSkeleton.baseOutcomeEffects` 升级为 `TaggedOutcomeEffect[]`，每条带 id + tag
- 改造现有 8 骨架：banquet / political / assassination / subordinate / imperial / intelligence / ally / military，每个补 1-2 条 failure/disaster 出口
- 新增 3 骨架：
  - **courtImpeachment**（朝堂构陷罢黜）：失败掉天策上将，灾难连掉尚书令+雍州牧+种 impeached_severely flag
  - **courtCounterstrike**（朝堂主动反击）：以 impeached_severely 为前置；成功伤建成、灾难致玄龄入狱
  - **seizeMilitaryCommand**（夺兵权请缨）：突厥犯边时元吉奏请代北征；失败夺兵权 ceiling -30、灾难再削左武卫
- npcPromptBuilder 按 outcome tag 分组渲染信号、追加 chosenOutcome 枚举提示

**时间窗 flag 触发器**

worldSimulator.runWorldTick 在 `isAfterDate(cal, 3, 15)` 后种入 `tujue_invasion` flag（约第 70 天，对应武德九年三月中），仅触发一次，作为 seizeMilitaryCommand 的 precondition。

**快进机制**

让玩家跳过无事件的日常循环，遇到事件触发自动停下。

- src/engine/world/fastForward.ts → planFastForward(state, days) 纯只读判定
- WorldSimulator.fastForward(maxDays) 循环 endDay+proceedFromBriefing，**每天重 plan**（NPC velocity 可能变），任一停止信号或 mode 切换为 event_scene/game_over 立刻退出
- DailyActivityScreen 在结束今日按钮旁加 [快进 3 日] [快进 7 日]

### v3.4.5 — 2026-04-28

NPC 涌现优化：alertness 接入决策系统 + 敌方 NPC 锁定出场。

**alertness 驱动事件反应**
- `NpcDecisionRule.conditions` 新增 `alertnessAbove/Below`，`matchConditions` 加 2 行 guard
- 6 个 NPC 各加 `_alert` 规则（alertnessAbove: 30）：事件后解锁反应 stance（谋士→情报反应，武将→巡防，太子→监控，元吉→施压，皇帝→平衡）
- handleEventEnd 广播：failure/disaster → 非参与 NPC +5；含阵亡/被擒 → +10
- NPC 决策 prompt 显示警觉值

**骨架 requiredNpcIds**
- EventSkeleton 新增 `requiredNpcIds?: string[]`，eventGenerator 合并锁定 NPC + LLM 选择（去重、过滤非 active）
- 6 个骨架锁定敌方 NPC：暗杀/军事冲突(建成+元吉)、宴会/弹劾(建成)、御前召见(李渊)、夺兵权(元吉)

**测试**
- 320 单测全过（+18）

**Review 修复（2026-04-29）**
- 活动 flag 白名单补全（`has_recent_intel` / `palace_insider_contacted` 原来静默无效）
- 尉迟 patience 衰减 2.0 → 1.5（防止行为永久单调）
- 宴会危局限全局 1 次（被阴一次不会再赴宴），刺杀保留多次
- 盟友离心 failure/disaster 打击目标分散（failure → 长孙无忌，disaster → 房玄龄）
- EndingScreen 按钮样式去重、ISceneManager 类型修复、GameLogger 持久化改为批量写入

### v3.4.5.1 — 2026-04-29

Review 修复 + 代码质量。详见 v3.4.5 末尾 Review 修复段。


## 后续重点

### 1. Eval 聚焦幻觉与硬错误
涌现质量是无底洞，且会随 NPC 和事件骨架增加自然改善。幻觉和错误是硬伤，直接破坏玩家体验。Eval 重心放在时间跳跃、虚构事件、称谓错误、人设违和等 P1 检测上，涌现指标作为参考慢慢调。

### 2. UI 优化，建立游戏感
当前功能基本完整，但视觉和交互缺乏"游戏感"。需要打磨 UI 细节：过场动画、日报呈现方式、活动选择的反馈感、事件场景的沉浸感。让玩家感觉在"玩游戏"而非"读文本"。

### 3. 等待时间优化
LLM 调用造成的等待时间是当前最大的体验问题。NPC 并行决策已将 3x 降为 1x，但每日 tick 仍需数秒。需探索：更激进的预加载策略、压缩 prompt token 数、缓存机制、UI loading 动画掩盖延迟。

### 引擎增强
- 骨架 fallback 变体（从 v2.0 场景迁移，LLM 生成失败时兜底）
- LLM 变体生成重试 + 结构校验
- 更多 NPC 决策规则覆盖

### 内容扩展
- 新增 NPC（秦叔宝、张公谨、杜如晦等）
- 替代历史事件补充（玩家选择不兵变的路线）
- 角色记忆丰富化
