# 玄武门之变 — LLM 驱动的历史互动叙事游戏

v2.0

## 简介

武德九年，正月至六月。玩家扮演秦王李世民，经历从暗流涌动到最终摊牌的半年博弈。长孙无忌、尉迟敬德、房玄龄等核心幕僚随侍左右，每一个决策都将改变大唐命运的走向。

LLM 实时生成 NPC 对话与旁白，6 个场景串联完整时间线，跨场景记忆传递让 NPC 的态度随玩家决策动态变化。

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

## 时间线 · 6 场景

| # | 场景 | 时间 | 地点 | 核心冲突 | 参与NPC |
|---|------|------|------|---------|---------|
| 1 | 暗流涌动 | 正月 | 秦王府·书房 | 派张亮赴洛阳联络豪杰，张亮被告下狱 | 长孙无忌、房玄龄 |
| 2 | 东宫鸩酒 | 二月 | 东宫·宴厅 | 建成设宴，一杯毒酒端到面前 | 长孙无忌、尉迟敬德、房玄龄 |
| 3 | 洛阳之议 | 三月 | 秦王府·书房 | 陛下欲遣世民赴洛阳，去则避祸失根基 | 长孙无忌、房玄龄 |
| 4 | 围困削权 | 四五月 | 秦王府·密室 | 弹劾如雪，突厥犯边，核心班底即将被调走 | 长孙无忌、尉迟敬德、房玄龄 |
| 5 | 太白经天 | 六月初一 | 太极宫·朝堂 | 天象示变，面圣对峙，反告后宫 | 长孙无忌、尉迟敬德、房玄龄 |
| 6 | 午夜密议 | 六月初三夜 | 秦王府·密室 | 最终决断：动手还是束手待毙 | 长孙无忌、尉迟敬德、房玄龄 |

场景之间通过过渡叙事衔接，CampaignManager 自动传递前序场景的决策结果和关系变化，LLM 据此调整 NPC 态度和叙事内容。

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
├── types/index.ts                # 全局类型定义
├── data/
│   ├── characters/               # 角色数据（一人一文件）
│   │   ├── liShimin.ts           # 李世民（玩家）
│   │   ├── changSunWuji.ts       # 长孙无忌
│   │   ├── weiChiJingDe.ts       # 尉迟敬德
│   │   ├── fangXuanLing.ts       # 房玄龄
│   │   ├── memoryLoader.ts       # 记忆加载（Markdown → MemoryEntry）
│   │   └── memories/             # 各角色基础记忆（.md 文件）
│   ├── scenes/                   # 场景配置（一场景一文件）
│   │   ├── undercurrent.ts       # 暗流涌动（正月）
│   │   ├── poisonedWine.ts       # 东宫鸩酒（二月）
│   │   ├── luoyangDebate.ts      # 洛阳之议（三月）
│   │   ├── politicalSiege.ts     # 围困削权（四五月）
│   │   ├── taibaiOmen.ts         # 太白经天（六月初一）
│   │   └── midnightCouncil.ts    # 午夜密议（六月初三夜）
│   └── timelines/
│       └── xuanwuGate.ts         # 玄武门时间线（场景编排 + 过渡叙事）
├── engine/
│   ├── llm/                      # LLM 适配器层（Registry 模式）
│   │   ├── types.ts              # LLMProvider 接口
│   │   ├── registry.ts           # Provider 注册中心
│   │   ├── openai.ts             # OpenAI 兼容适配器
│   │   ├── anthropic.ts          # Anthropic 适配器
│   │   └── sseParser.ts          # SSE 流式解析
│   ├── promptBuilder.ts          # System prompt 组装（纯函数，含称谓规则）
│   ├── sceneManager.ts           # 单场景引擎（状态机 + 观察者模式）
│   ├── campaignManager.ts        # 多场景编排（记忆传递 + 关系变化）
│   └── outcomeBuilder.ts         # 场景结果提取（决策识别 + 关系变化估算）
├── components/
│   ├── NarratorPanel.tsx          # 顶部场景信息栏
│   ├── DialogueFlow.tsx           # 对话流渲染
│   ├── ActionPanel.tsx            # 底部操作面板
│   ├── EndingScreen.tsx           # 结局画面
│   ├── TransitionScreen.tsx       # 场景过渡画面
│   └── GameScene.tsx              # 游戏场景容器
├── App.tsx                        # 入口：开屏 → 场景 → 过渡 → 结局
└── index.css                      # 全局样式（古风配色 + 字体 + 动画）
```

## 架构设计

### 引擎层
- **SceneManager**：单场景状态机 + 观察者模式，管理对话循环、阶段推进、结局触发
- **CampaignManager**：多场景编排，自动传递 SceneOutcome（策记忆、关系变化），生成前情回顾注入下一场景
- **PromptBuilder**：纯函数构建 System Prompt，包含角色三层记忆（基础/短期/反思）、称谓规则、输出格式约束
- **OutcomeBuilder**：启发式提取场景结果（关键决策识别 + 关系变化估算）

### 数据层
- **角色系统**：Big Five 人格模型 + 三层记忆 + 关系网络（信任度 0-100）+ 语言风格约束
- **场景系统**：每场景 3 阶段，每阶段有 turnRange 和 suggestedActions，结局触发支持硬触发（回合数）+ 软触发（语义识别）
- **时间线系统**：固定场景顺序 + 过渡叙事，方案 A（叙事内容通过记忆传递动态适应玩家决策）

### LLM 适配
- Registry 模式，支持 6 家 LLM 提供商
- SSE 流式接收
- JSON 可靠解析：括号计数提取 + 截断修补 + 文本格式 fallback

## v2.0 相比 v1.0 的变化

### 新增
- 完整武德九年时间线：从 1 个场景扩展到 6 个场景，覆盖正月至六月
- CampaignManager 多场景编排引擎
- 跨场景记忆传递与关系变化
- 场景过渡画面（TransitionScreen）
- 角色记忆系统（Markdown 文件 → 运行时加载）
- 完整称谓与人物关系规则（全局 prompt 约束）

### 优化
- 称谓规则：从简单禁令扩展为正面映射表（A→B 格式），覆盖皇族互称、亲属称呼
- NPC 参与度按场景调整：政治密谋场景（正月/三月）只有文臣，需要武力的场景才有敬德
- 配角行为规范：李神通等皇族配角不再出现不合身份的描写
- JSON 输出格式：characterId 明确列出可选值，杜绝拼音 ID 显示问题
- 结局触发统一为 minTurns: 5（测试阶段）

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

## 后续规划

### 引擎增强
- 结局触发逻辑优化：硬触发改为 maxTurns，minTurns 作为允许结局的门槛
- LLM 响应性能监控与优化
- 条件分支时间线（方案 B：场景间条件跳转，基于 outcomeTag）

### 内容扩展
- 新增 NPC（秦叔宝、张公谨、杜如晦等）
- 角色记忆丰富化
- 场景 narratorIntro 动态化（根据前序 SceneOutcome 调整开场）

### 体验增强
- 美术资源（角色立绘、场景背景）
- 音效与背景音乐
- 对话打字机动画
- 移动端适配优化
