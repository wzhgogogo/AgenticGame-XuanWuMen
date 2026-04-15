# 玄武门之变 — LLM 驱动的历史互动叙事游戏

v3.0

## 简介

武德九年，正月至六月。玩家扮演秦王李世民，在涌现式世界模拟中经历从暗流涌动到最终摊牌的半年博弈。长孙无忌、尉迟敬德、房玄龄等核心幕僚随侍左右，每一个决策都将改变大唐命运的走向。

没有固定剧情线——7 条压力轴驱动世界运转，NPC 作为自主 Agent 每日决策，事件从利益冲突的压力积累中自然涌现。即便是玄武门之变本身，也可能因为玩家的选择而不发生。

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

v3.0 不再有固定场景序列。以下 8 种事件骨架由压力系统驱动涌现：

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
│   ├── DailyActivityScreen.tsx   # 日常活动选择界面
│   ├── DailyBriefingScreen.tsx   # 当日汇报界面
│   ├── WorldStateHud.tsx         # 压力定性展示
│   ├── NarratorPanel.tsx         # 顶部场景信息栏
│   ├── DialogueFlow.tsx          # 对话流渲染
│   ├── ActionPanel.tsx           # 底部操作面板
│   ├── EndingScreen.tsx          # 结局画面
│   ├── TransitionScreen.tsx      # 场景过渡画面
│   └── GameScene.tsx             # 游戏场景容器
├── App.tsx                        # 入口：状态机驱动游戏流程
└── index.css                      # 全局样式（古风配色 + 字体 + 动画）
```

## 架构设计

### 世界模拟层（v3.0）
- **WorldSimulator**：核心模拟循环，管理 title_screen → daily_activities → daily_briefing → event_scene → game_over 状态机
- **压力系统**：7 轴压力引擎，每日 tick（velocity + decay towards baseline），支持 floor/ceiling 约束
- **NPC Agent**：两阶段决策管线（确定性规则过滤 → LLM 推理），每角色独立 patience/alertness/commitment 状态
- **幕后 Agent**：建成/元吉/李渊 纯确定性每日压力贡献，不消耗 LLM token
- **事件生成器**：骨架模板定义结构 + LLM 生成具体变体，同一骨架在不同世界状态下产生不同事件

### 引擎层
- **SceneManager**：单场景状态机 + 观察者模式，管理对话循环、阶段推进、结局触发（v3.0 复用）
- **PromptBuilder**：纯函数构建 System Prompt，包含角色三层记忆（基础/短期/反思）、称谓规则、输出格式约束
- **OutcomeBuilder**：启发式提取场景结果（关键决策识别 + 关系变化估算）

### 数据层
- **角色系统**：Big Five 人格模型 + 三层记忆 + 关系网络（信任度 0-100）+ 语言风格约束
- **骨架模板**：8 种事件类型，每种定义阶段框架、触发条件、约束、收束规则
- **日常活动**：5 类 12 项，各有压力效果和场景文案

### LLM 适配
- Registry 模式，支持 6 家 LLM 提供商
- SSE 流式接收
- JSON 可靠解析：括号计数提取 + 截断修补 + 文本格式 fallback

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

## 后续规划

### 引擎增强
- 骨架 fallback 变体（从 v2.0 场景迁移，LLM 生成失败时兜底）
- LLM 变体生成重试 + 结构校验
- 压力参数平衡调优（测试驱动）
- 更多 NPC 决策规则覆盖

### 内容扩展
- 新增 NPC（秦叔宝、张公谨、杜如晦等）
- 替代历史事件补充（玩家选择不兵变的路线）
- 角色记忆丰富化

### 体验增强
- 美术资源（角色立绘、场景背景）
- 音效与背景音乐
- 对话打字机动画
- 移动端适配优化
