---
name: eval
description: 评估 LLM 输出质量——读取自动跑局日志，计算量化指标 + 涌现质量 + 规则检测，Claude Code 手动抽样替代 Gemini
---

# Eval — LLM 输出质量评估

## 与 test skill 的区别

- **test**: 跑 vitest 单测 + 构建，验证代码功能是否正确
- **eval**: 读取试玩日志，评估 LLM 驱动的游戏体验质量（事件节奏、NPC 决策一致性、涌现质量、记忆连贯性）

## 输入

`scripts/logs/YYYYMMDD-HHMMSS-<strategy>-autoplay.json`：自动跑局脚本输出的日志。`scripts/logs/` 目录下按时间排序，默认取最新一份。

配套 `.prompts.jsonl`：同名 sidecar 文件，记录每次 LLM 调用的 prompt 和 response。

## 执行步骤

1. 如果用户没指定日志：`ls scripts/logs/*.json | grep -v '.eval.json' | tail -1` 取最新的
2. 运行 `npx tsx scripts/eval-playthrough.ts <path>`
3. 结果自动保存到同目录 `<时间戳>-autoplay.eval.json`
4. 向用户报告关键发现（**P1 问题优先**），并把结论追加到 [`scripts/EVAL-NOTES.md`](../../../scripts/EVAL-NOTES.md)（顶部、时间倒序）
5. 如需深入检查 LLM 输出质量，手动读 `.prompts.jsonl` 做抽样分析（见下方流程）

## 评估输出（全部纯规则，不调 LLM）

### Part 1: 量化指标

| 指标 | 说明 |
|------|------|
| 游戏天数 | 总天数 |
| 事件触发次数 + 间隔 | 是否扎堆或空窗 |
| NPC 决策分布（按 stance 聚合） | 每个 NPC（6 人）各 stance 出现次数（19 个细粒度 stance） |
| 降级次数（degrade > 0） | LLM 产出不合法的频率 |
| 活动选择分布 | 玩家（自动）选了哪些活动 |
| 压力轴起止值 + 变化趋势 | 7 轴从头到尾的变化幅度和方向 |
| 结局类型 | E1/E3/F1/F5/N1 五结局中的哪个被触发 |
| 资产剥夺事件 | loseNpc/loseOffice/confiscateMilitary/flag outcome 触发次数 |
| NPC 状态变化 | 各 NPC 最终 status（active/exiled/imprisoned/deceased/dispatched） |
| 事件 outcome 分布 | chosenOutcome 在 success/partial/failure/disaster 中的分布 |

### Part 2: 规则检测（需要 .prompts.jsonl）

**P1 优先级（硬错误，必须修复）：**

| 检测项 | 类型 key | 规则数 | 说明 |
|--------|----------|--------|------|
| 历史跳跃 | `historical_leak` | 28 禁用词 | LLM 输出含禁用词（玄武门之变、登基、贞观、继位、践祚、凌烟阁等），`<thought>` 标签内不算 |
| 称谓错误 | `naming_violation` | 6 条 regex | NPC 对李世民称"陛下/圣上"、直呼李世民/李渊姓名、NPC 用亲属称呼太子齐王、使用后世称谓（皇上/万岁爷） |
| 虚构事件 | `fabricated_event` | 4 条模式 | LLM 引用了未实际发生的事件（"昨日刺杀""上次宴会""那次兵变"等引用性表达），与 eventLog 交叉校验，标记为"需人工确认" |
| 人设违和 | `persona_violation` | 6 NPC 各有反人设词表 | 长孙/房玄龄：拔剑/暴怒/大骂；尉迟：隐忍/迂回/婉转/试探/缓缓；建成：自称"朕"/粗鄙武夫语；元吉：深谋远虑/运筹帷幄；李渊：自称"孤"/激进冒险语 |

**P2 优先级（质量问题，慢慢调）：**

| 检测项 | 类型 key | 说明 |
|--------|----------|------|
| 回复重复 | `response_repetition` | 连续两条同类输出 5-gram overlap > 40%（仅检查 scene_dialogue / event_generation / memory_extraction） |
| 记忆未体现 | `memory_not_used` | prompt 注入了记忆关键词但 response 完全没有体现 |

输出按 P1 → P2 顺序展示，P1 类型标注 ⚠ 前缀。

### Part 3: 涌现质量分析

| 指标 | 说明 | 健康阈值 |
|------|------|----------|
| Shannon 熵 | NPC stance 分布多样性 | ≥ 1.0 |
| 主导 stance 占比 | 最高频 stance 的比例 | ≤ 80% |
| 行动重复率 | action 文本去重后 / 总数 | ≤ 60% |
| 沉默天数 | 有 tick 但无该 NPC action 的天数 | ≤ 总天数 × 50% |
| stance 转变次数 | 相邻两天 stance 不同的次数 | 越高越好 |
| 事件前后行为变化 | 事件触发日前后各 2 天，NPC stance 是否有变化 | 应有变化 |

### Part 4: 记忆连贯性

| 指标 | 说明 |
|------|------|
| 新增记忆总数 | memory_diff 中新增条数 |
| 重复率 | 相同 memory 出现多次的比例 |
| 情感标签多样性 | 不同情感标签数 |
| 增长曲线 | 每次事件后新增的记忆数 |

## 解读指引

### NPC stance 分布
- **健康**：某 NPC 3-5 种 stance 混用，符合人设倾向
- **异常**：熵 < 1.0 或单一 stance > 80%（循环陷阱）
- **诊断**：看 `npcDecisionRules.ts` 的 `allowedStances` 是否太窄，或耐心衰减导致某档位卡住
- **v3.4.4 注意**：6 个 NPC 各有不同的耐心衰减速率——建成 0.4 / 元吉 1.5 / 李渊 0.2 / 长孙 0.8 / 敬德 1.2 / 玄龄 0.6。元吉应较快升级到激进 stance，李渊应长期保持观望
- **v3.4.5 alertness 机制**：事件后参与 NPC alertness +10，failure/disaster 广播非参与者 +5/+10。每个 NPC 有 `_alert` 规则（alertnessAbove: 30）解锁反应 stance。预期：经历 3 次事件后（alertness ≥30），NPC 应出现新 stance（如 counterspy/patrol/plant_spy）。如果事件后 stance 仍不变，检查 alertness 是否被正确累积

### 涌现失败信号
- NPC 事件前后行为完全不变 → 检查 alertness 累积是否 ≥30（v3.4.5 _alert 规则阈值），以及 handleEventEnd 是否正确广播
- 沉默天数过多 → 耐心衰减 + 规则覆盖缺口（如尉迟 patience < 30 且 desperation < 50 时无规则匹配），或 LLM API 500 错误导致决策被静默跳过
- 行动描述重复率高 → LLM 对该 NPC 的 prompt 缺乏变化
- 敌方 NPC 从不出场 → 检查骨架 `requiredNpcIds` 是否包含敌方 ID（v3.4.5），以及该 NPC 是否仍 active

### 压力轴变化
- **健康**：有 2-3 条轴明显上升（形成张力），1-2 条下降或小幅波动
- **异常**：单轴暴涨 > +40 且与 NPC 行为无关；或 7 轴全部 < +10（无张力）

### 降级率
- **健康**：< 10%
- **异常**：> 30% 或 Level 3 回退频发

### 结局与资产剥夺（v3.4.4 新增）
- **5 结局光谱**：E1 玄武门成功 / E3 惨胜 / F1 政治终局失败 / F5 武力发动失败 / N1 时光流逝
- **健康**：多次 autoplay 应至少触达 3 种不同结局；chosenOutcome 分布不应过度倾向单一 tag
- **异常**：所有跑局都是同一结局 → 阈值需要调整；failure/disaster 从未触发 → 骨架 resolutionSignals 可能引导性不足
- **资产剥夺**：loseNpc/loseOffice/confiscateMilitary 应偶尔出现（≥1 次/局为健康），从未出现说明 failure/disaster outcome 路径不通

## Claude Code 手动抽样检查流程

eval 脚本不再调用外部 LLM API。如需深入检查 LLM 输出质量，在对话中执行以下步骤：

1. **读取 prompts.jsonl**：`Read` 对应日志的 `.prompts.jsonl` 文件
2. **分类**：按 `classifyPromptRecord` 逻辑分为 scene_dialogue / npc_decision / event_generation / memory_extraction
3. **抽样**：每类随机取 2-3 条
4. **逐条分析**：
   - scene_dialogue：角色一致性、历史准确性、对话自然度、记忆体现
   - npc_decision：stance 是否合理、pressureDelta 是否符合白名单、reasoning 逻辑
   - event_generation：事件与压力轴的关联性、叙事质量
   - memory_extraction：提取是否准确、是否遗漏关键信息
5. **汇总**：给出 1-5 分评价 + 具体问题列表

## 已知限制

- 规则检测依赖关键词匹配，可能漏检语义层面的历史穿越
- 涌现指标是间接度量（行为多样性 ≠ 叙事质量），需结合手动抽样判断
- `autoplay.test.ts` 的 MAX_DAYS 目前是 30 天，跑完约 25-30 分钟

## 日志归档

日志和 eval 结果都在 [`scripts/logs/`](../../../scripts/logs/) 下，文件名 `YYYYMMDD-HHMMSS-<strategy>-autoplay.json` / `.eval.json` / `.prompts.jsonl` 配套。不要手动重命名，脚本按时间戳推断配对。
