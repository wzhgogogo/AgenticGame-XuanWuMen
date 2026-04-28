---
name: post-change-verify
description: 代码改动完成后的收尾验证——按改动范围跑对应验证（tsc、单测、冒烟），并追加条目到 EVAL-NOTES.md / TEST-LOG.md。触发时机：改完 src/engine/、src/data/、src/types/ 下 .ts 的任意非 trivial 修改，或用户要求"走一遍验证"。
---

# Post-Change Verify — 改动后验证与归档

## 何时调用

**自动触发**（主动调用）：
- 改了 `src/engine/`、`src/data/`、`src/types/` 下任何 `.ts` 文件且不是 trivial edit（typo/注释/一行参数调整）
- 改了 `scripts/*.ts` 里涉及主流程的代码（非纯文档/路径微调）

**不触发**：
- 只改 README / 注释 / *.md
- 只改样式（CSS、tailwind）
- 只改 src/App.tsx 或 UI 组件（除非也改了 engine）
- 用户明确说"不要验证"

**用户强制触发**：`/post-change-verify` 或自然语言"走一遍验证流程"

## 触发判断矩阵

| 改动范围 | tsc | 单测 | 冒烟 | notes | test-log | 同步 skill |
|---|---|---|---|---|---|---|
| 纯类型/工具函数 | ✅ | ✅ | — | 一句话 | — | — |
| engine/world 业务逻辑 | ✅ | ✅ | — | 详写 | ✅ 若发现坑 | 检查 test skill |
| promptBuilder / LLM 调用 / 解析 | ✅ | ✅ | ✅ | 详写 | ✅ | 检查 test + eval skill |
| 规则/骨架/数据层 | ✅ | ✅ | — | 简写 | — | — |
| 新增或改写单测文件 | ✅ | ✅ | — | 一句话 | — | **必须更新 test skill 的文件清单** |
| 改 autoplay 日志格式 / eval 字段 | ✅ | — | — | 一句话 | — | **必须更新 eval skill** |
| scripts/autoplay 或 eval 脚本 | ✅ | — | — | 一句话 | — | 若改了日志字段→更新 eval skill |
| 改 eval 规则检测（禁用词/称谓/人设/虚构） | ✅ | — | — | 一句话 | — | **必须更新 eval skill 的 Part 2 规则表** |
| 改 NPC stance/决策规则 | ✅ | ✅ | — | 详写 | — | **更新 test skill 坑 #7 + eval skill NPC 分布说明** |
| 改 endingResolver / 结局判定 | ✅ | ✅ | — | 详写 | — | 检查 eval skill 结局指标 |
| 改骨架 outcomeEffects / TaggedOutcomeEffect | ✅ | ✅ | — | 详写 | — | 检查 eval skill outcome 分布说明 |
| 改 flags.ts / FlagKey 白名单 | ✅ | ✅ | — | 简写 | — | — |
| 改 fastForward 快进逻辑 | ✅ | ✅ | — | 简写 | — | — |

**冒烟规则**：仅当改了 [npcPromptBuilder.ts](../../src/engine/world/npcPromptBuilder.ts)、[worldSimulator.ts](../../src/engine/world/worldSimulator.ts) 的 LLM 调用段、[jsonExtractor.ts](../../src/engine/jsonExtractor.ts)、[memoryExtractor.ts](../../src/engine/world/memoryExtractor.ts)、[eventGenerator.ts](../../src/engine/world/eventGenerator.ts)、[endingResolver.ts](../../src/engine/world/endingResolver.ts)、或任何 [src/engine/llm/](../../src/engine/llm/) 文件时才跑。其他改动不跑（冒烟 ~100s + 花 token）。

**autoplay 不在自动流程内**（10-30 分钟），只在用户显式要求时跑。

## 文档同步规则（重要）

每次非 trivial 改动后，除了跑验证，还必须检查以下文档是否需要同步更新。不要依赖记忆，依赖这张清单。

### 文档清单

| 文档 | 何时更新 | 更新什么 |
|------|---------|---------|
| **CLAUDE.md** | 移动/删除/新增文件；改模块职责；发现新待改进 | 模块导航表路径、已废弃/已删除列表、已知待改进 |
| **README.md** | 每次功能性改动（非 typo） | 开发日志 v3.x.x 段追加改动摘要 |
| **devlog.md** | 每次非 trivial 改动 | 按日期倒序追加条目，写「为什么」和「影响」，不复述代码细节 |
| **TEST-LOG.md** | 新增/修改测试文件；发现测试坑 | 追加日期段，含新增测试表、发现的坑、最终结果；更新底部测试层级表 |
| **EVAL-NOTES.md** | engine/world 业务逻辑或 prompt 改动 | 按详写/简写格式追加条目（见下方模板） |
| **test skill** | 新增/删除/重命名 `*.test.ts`；用例数变化；发现新坑 | 文件清单表 + 合计行 + "已知的坑"章节 |
| **eval skill** | 改 autoplay 日志字段或 eval 脚本指标 | 输入格式说明、量化指标表 |
| **arch-guard skill** | 移动/新增文件改变了项目结构 | 第 7 节项目结构树 |
| **本 skill** | 改 LLM 相关文件触发列表；新增自动化 skill | 冒烟规则段、文档清单 |

### 快速判断流程

1. **改了文件位置（移动/删除/新增）？** → CLAUDE.md 模块导航表 + arch-guard 项目结构树
2. **改了测试？** → test skill 文件清单 + TEST-LOG.md
3. **改了 engine/prompt？** → EVAL-NOTES.md + devlog.md + README 开发日志
4. **以上都不是？** → 大概率不需要更新文档

**原则**：改了代码描述的"世界"（文件、字段、数值），文档必须跟着改。漏更新比不写更糟——过期文档会误导。

## 执行步骤

1. **识别改动范围**：用 `git status` 或对话上下文判断，落到上面的矩阵里
2. **tsc 校验**：`npx tsc -b` — 有错必须先修再进下一步
3. **单测**：`npx vitest run --exclude 'scripts/**'` — 红了先修
4. **冒烟（条件）**：`npx tsx scripts/llm-integration-test.ts` — 读 4 个 PASS
5. **文档同步**：按上面的文档清单逐项检查，需要更新的全部更新
6. **汇报**：一句话结论 + 每项状态（pass/fail/skipped/updated）

## EVAL-NOTES 条目格式

**详写**（方案性改动）：
```markdown
## YYYY-MM-DD · 简短标题

### 发现 / 动机
（一段，为什么改）

### 改动
（改了什么文件、核心机制）

### 验证
- tsc ✅ / 单测 X/Y ✅ / 冒烟 4/4 ✅

### 待观察
（可能需要下次 autoplay 验证的点）
```

**简写**（小调整/bug 修）：
```markdown
## YYYY-MM-DD · 简短标题
一段文字说明做了什么、为什么。验证通过。
```

放在文件顶部（时间倒序）。

## TEST-LOG 条目格式

```markdown
## YYYY-MM-DD · 坑标题

**现象**：......
**根因**：......
**修复**：......
**防复发**：（可选：在 test skill 的"已知的坑"里加一条？）
```

## 原则

- 失败不要自己放过 — 任何一步红了先停下修，不要为了"把流程走完"而忽略
- 冒烟失败分类：测试代码过时（改测试） vs LLM 产出不稳（改 prompt/解析） vs 逻辑 bug（改生产）
- 简洁优先：单测绿了、tsc 绿了就一句话汇报；只有失败或发现新坑时才长篇写

## 不要做的事

- 不要在这个 skill 里跑 autoplay（10-30 分钟太贵）
- 不要擅自改 CLAUDE.md、README 里的命令列表，除非用户明确说"同步文档"
- 不要在 EVAL-NOTES 里堆垃圾信息——"改了个 typo" 这种不配有条目
