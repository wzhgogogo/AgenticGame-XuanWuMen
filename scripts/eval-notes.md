# Autoplay Eval 结论与改造记录

按时间倒序。每条记录：eval 日期 → 主要发现 → 改造方案 → 动机。

---

## 2026-04-22 · Eval 检测强化 + Stance 精细化

### 发现

对 `20260422-143243-suppress_jiancheng-autoplay.json` 跑 eval，发现 **17 条 P1 称谓违规**：NPC 对李世民使用"陛下""圣上"等帝王称谓。这是当前最突出的 LLM 幻觉问题——NPC prompt 中有称谓约束但 LLM 遵从度不够。

涌现指标方面，旧的 8 stance 系统下 NPC 行为多样性偏低（尉迟连续 14 天 gather_intel），确认 stance 粒度不足是根因。

### 改动

**Eval 检测强化（evalPlaythrough.ts）：**
- 禁用词 12 → 28（补充继位/登极/新君/践祚/凌烟阁/贞观之治/杀兄/杀弟/鸩酒/兵变成功/夺位等变体）
- 称谓规则 2 → 6（新增：NPC 直呼李世民、李渊姓名检测、后世称谓检测）
- 新增虚构事件检测（fabricated_event）：4 条引用性模式与 eventLog 交叉校验
- 新增人设一致性检测（persona_violation）：文臣反暴烈词、武将反谨慎词
- 输出改为 P1/P2 分级：P1（历史跳跃/称谓/虚构/人设）优先展示，P2（重复/记忆）作参考

**NPC Stance 精细化（8 → 19）：**
- 拆分为情报类（4）、文臣类（6）、武将类（7）、极端类（2），详见 README v3.4.2
- 三个 NPC 决策规则全面重写，各 4-5 个紧迫度档位

### 优先级调整

**Eval 重心从涌现质量转向幻觉/硬错误检测。** 原因：涌现是无底洞，且会随 NPC 和事件骨架增加自然改善；幻觉/错误是硬伤，直接破坏玩家体验。后续 eval 以 P1 检测为主，涌现指标慢慢调。

### 待观察
- 19 stance 系统下 NPC 行为多样性是否改善（需重新跑局验证）
- 称谓违规是否需要在 prompt 端加强约束（eval 检测到了但修复在 prompt 侧）
- 虚构事件和人设检测的误报率

---

## 2026-04-20 · 叙事 prompt 约束补齐 + 引擎目录清理

### 发现 / 动机
autoplay 跑局中 LLM 在武德九年一月就写出"玄武门之变""登基"等未来事件。根因：叙事类 prompt（promptBuilder.ts）缺乏 NPC prompt 已有的全局约束；结局 prompt 不含当前日期，LLM 无时间锚点。同时 engine/ 目录有废弃文件、promptBuilder 位置不合理、测试文件混在源码中。

### 改动
- **A1** `src/engine/world/promptBuilder.ts`：buildSystemPrompt 输出格式段追加 3 条写作规则（禁未来事件、白描史书体、称谓不混用）
- **A2** `src/engine/world/promptBuilder.ts`：buildMessages 新增 `currentDate` 参数，结局 prompt 注入当前游戏日期
- **A2** `src/engine/sceneManager.ts`：buildMessages 调用传入 `this.scene.time`
- **B1** 删除废弃文件：campaignManager.ts、outcomeBuilder.ts、__test__promptBuilder.ts
- **B2** promptBuilder.ts 从 engine/ 根移至 engine/world/，更新 sceneManager import
- **B3** 7 个 .test.ts 迁入 engine/world/__tests__/，修正 import 路径
- **B4** 同步更新 CLAUDE.md 模块导航表 + 废弃列表、arch-guard skill 项目结构树、test skill 文件清单

### 验证
- tsc ✅ / 单测 9 files 226 cases ✅ / 冒烟 4/4 ✅

### 待观察
- 叙事约束效果需下次 autoplay 验证（LLM 是否仍在早期写出玄武门之变）
- currentDate 注入是否有效减少时间跳跃

## 2026-04-20 · 日报 description 跳戏修复

**现象**：跑局中出现 "血洗玄武门后，我将目光投向那些在阴影中战栗的朝臣……" 这类日报文本——第一人称 / 文学腔 / 提及尚未发生的玄武门之变，严重破坏沉浸感。

**根因**：`npcPromptBuilder` 里对 `description` 字段只写了「一句话描述（≤30 字，用于日报）」，完全没约束视角/时态/风格/禁忌。

**修复**：
- [npcPromptBuilder.ts](../src/engine/world/npcPromptBuilder.ts) 的输出规范段加入 "description 字段写作规范"：明确第三人称外部叙述、当日进行时、平实史书体、禁文学比喻、禁前瞻性词汇，并给两条范例
- [promptConstraints.ts](../src/data/promptConstraints.ts) `HISTORICAL_CONTEXT` 禁用词补充：玄武门之变、血洗玄武门、即位、登基、入继大统

验证：tsc ✅ / 226 单测 ✅ / 冒烟待 autoplay 空窗后补跑。

---

## 2026-04-20 · 30 天 autoplay 跑局 + 叙事结局检测修复

**来源日志**：[logs/20260420-135617-autoplay.json](logs/20260420-135617-autoplay.json)

### 发现

- MAX_DAYS 从 15 提升到 30，成功跑完全程（136 条日志，耗时 ~28 分钟）
- Day 2 情报事件场景中，LLM 生成了"秦王被剥夺所有兵权，幽禁于深宫"的结局文本，但游戏未触发 game over，后续 27 天照常推进
- 根因：`checkGameOver()` 只检查骨架类型（military_conflict）、时间（month > 6）、压力阈值（≥ 95），完全不读事件结局文本；`handleEventEnd` 把结局文本当纯叙事存储，无机械反馈
- LLM 之所以写出终结性结局：prompt 中无任何约束禁止负面结局 + autoplay 输入池含"投降""罢了"等消极词触发了 dismissPatterns 提前收束

### 修复

在 `worldSimulator.ts` 的 `handleEventEnd` 中新增 `detectNarrativeEnding(summary)` 方法：
- 正则匹配终结性关键词（幽禁/囚禁/斩首/处死/流放/削爵/废为庶人等），要求主语含"秦王/李世民/世民"避免误匹配 NPC
- 死亡类 → `coup_fail_captured`，囚禁/流放类 → `deposed`
- 叙事检测优先于机械检测（`narrativeEnding ?? mechanicalEnding`）
- 零 token 开销，单文件改动

### 待观察

- 关键词覆盖率：LLM 可能用隐晦表述绕过匹配，后续跑局补词
- 是否需要同时在 prompt 端约束 LLM 不写超越当前压力状态的终结性结局

---

## 2026-04-20 · 第一次系统化 eval

**来源日志**：[logs/20260420-132745-autoplay.json](logs/20260420-132745-autoplay.json)
**评估结果**：[logs/20260420-132745-autoplay.eval.json](logs/20260420-132745-autoplay.eval.json)
**综合评分**：2.5/5（LLM-as-Judge）

### 量化信号

- 15 天 × 2 次事件触发（间隔 9 天，偏稀）
- 军事准备 +41 一骑绝尘，其他轴涨幅 3-18
- 尉迟敬德 14 次决策全是 `gather_intel`，零 confront / warn
- 长孙 gather_intel×4 + seek_allies×3，房玄龄 scheme×4 + seek_allies×3 + gather_intel×2

### Judge 抱怨

1. **角色一致性 3/5**：尉迟人设"刚猛激进"被抹平为情报员
2. **节奏合理性 2/5**：15 天决策序列陷入"察看动向→确认嫌隙→摸清底细"的重复循环
3. **压力叙事弧 3/5**：military +41 与 NPC 行为脱节（都在搜情报，军备却暴涨）
4. **涌现质量 2/5**：NPC 决策高度模板化，"涌现"停留在词汇替换层

### 根因定位

**问题 ②（决策循环）的根因**：[npcDecisionRules.ts](../src/data/agents/npcDecisionRules.ts) 的 `enabledActions` 动作池过窄——
- 尉迟中段（patience 30-60）`enabledActions` 只给 `['gather_intel']` 一个选项
- 跳到激进档需 `qinwangfu_desperation > 50`，本局 desperation 仅 25→31，门槛够不着
- 结果：LLM 无得可选，只能反复输出 gather_intel

**问题 ③（行为/压力脱节）的根因**：`actionType` 一字段扛三职（LLM 选项 / 语义标签 / 压力 delta 钩子）——
- 尉迟规则把"练兵 military +2"的效果钉在了 `gather_intel` 这个 actionType 上（`reason: '敬德加紧练兵'` 但 actionType 仍叫 gather_intel）
- military +41 ≈ 尉迟 14×2 + 长孙/房玄龄在 succession>55 时各 +1 ≈ 40+，精准对上
- 日志/prompt 只看 actionType 就产生"搜情报怎么军备涨这么多"的割裂感

两问题同一坏味道：**规则把"枚举动作"当作唯一接口**，窄+错位。

### 改造方案：意图与动作解耦（方案②）

**核心思路**：规则只定"立场大类"（stance），LLM 自由产出具体 action 文本 + 压力 delta 提议。

#### A. Stance 8 分类

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

#### B. 规则层降格为 stance gate

- `NpcDecisionRule.enabledActions` → `allowedStances: NpcStance[]`
- 每档 3-5 个 stance（不再是 1 个），LLM 真正有得选
- 删除 `basePressureEffects`（让 LLM 提议数值）
- breakdown / abandon 档位加 `once: true`，触发后该规则永久失效
- 每 NPC 配 `impactWhitelist`：能推的压力轴白名单

#### C. LLM 输出 NpcIntent（新结构）

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

#### D. Cap 分档（不一刀切）

| Stance 类别 | 单条 \|Δ\| | 总 ∑\|Δ\| | 条数 |
|---|---|---|---|
| 常态（observe/intel/persuade/scheme） | 3 | 5 | 3 |
| 爆发（confront/mobilize） | 4 | 7 | 3 |
| 破局（abandon） | 6 | 12 | 4 |
| 破局（breakdown） | 8 | 15 | 4 |

**动机**：真实历史的"敬德逼宫"是压力数轴的阶跃，不是线性累积。用常态 cap 5 模拟会把质变日和普通日抹平。breakdown/abandon 全局各 1 次，给足突破通道不怕滥用。

#### E. 降级路径（3 级）

- **Level 1 · 矫正**：超 cap 按比例缩放 / 白名单外 axis 丢该条 / 空字段填兜底 → intent 保留
- **Level 2 · stance 降级**：stance 不在允许清单 → 降为 allowedStances[0]，deltas 清零
- **Level 3 · 整单丢弃**：JSON 解析失败 / 必填缺失 → 当日视为 observe + 空 delta

**动机**：LLM 产出不稳定是常态，降级比报错好。日志记录降级次数作为 prompt 质量指标。

#### F. 软约束（替代硬性 stance 冷却）

prompt 里告知"你最近 3 天选过 {...}"，让 LLM 自己判断是否推进。不硬性禁止连选。**动机**：真实人物会连续几天做同一件事（情报布网），硬冷却会制造无根据的行为切换。

### 预期收益

- 尉迟 patience 中段在 persuade/mobilize/scheme 三选一，不再被锁死
- action 字段变自由文本，日志/叙事/涌现三倍可读
- pressureDeltas 与 stance 语义对齐，不再有"搜情报→military+2"错位
- breakdown/abandon 作为质变节点给叙事弧打点

### 待观察

- LLM 提议 delta 的分布是否稳定（靠 clamp/白名单压住）
- prompt token 增量（预计 +30%）
- 首次上线可能需要 2-3 轮 autoplay 回调 cap 幅度
