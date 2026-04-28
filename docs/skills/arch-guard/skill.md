---
name: arch-guard
description: 玄武门 MVP 架构约束守卫——每次编写或修改模块前必须执行，确保分层规则、松耦合规则、代码卫生和项目结构一致性
---

# Arch Guard — 玄武门 MVP 编码与架构规范

你在修改或新增任何代码之前，**必须遵守以下所有规则**。如果某个改动会违反规则，停下来告知用户并给出合规的替代方案。

---

## 1. 分层规则（依赖方向：只能向下，不能向上或平级跨层）

```
types/          ← 最底层，零依赖（不 import 任何项目内模块）
data/           ← 只依赖 types/
engine/         ← 只依赖 types/ 和 data/
components/     ← 只依赖 types/，通过 props/context 接收 engine 数据
App.tsx         ← 唯一的组装点（可 import 所有层）
```

**具体约束**：
- `types/` 中的文件：禁止 import 项目内任何其他模块
- `data/` 中的文件：只能 import `types/` 下的类型
- `engine/` 中的文件：只能 import `types/` 和 `data/` 下的内容
- `components/` 中的文件：只能 import `types/` 下的类型，**禁止直接 import `data/` 或 `engine/`**
- `App.tsx`：是唯一把 engine 和 components 组装在一起的地方

**engine/ 内部例外**：`worldSimulator.ts` 作为世界引擎调度中枢，可以 import engine/ 内的其他模块。其他 engine 模块之间尽量通过参数/接口通信，避免直接 cross-import。

---

## 2. 松耦合规则

| 规则 | 说明 |
|------|------|
| 组件不碰数据 | components/ 不直接 import data/ 文件，数据通过 props 或 React Context 传入 |
| promptBuilder 是纯函数 | 输入数据 → 输出字符串/消息数组，不调用 API、不产生副作用 |
| 新增人物 = 加数据文件 | 在 `data/` 下加一个文件即可，不需要改 engine/ 或 components/ |
| 换 LLM = 加适配器 | 在 `engine/llm/` 下加一个文件并注册到工厂函数，不需要改 engine/ 其他模块 |
| 新增事件类型 = 加骨架文件 | 在 `data/skeletons/` 下加一个文件并注册到 index.ts，不需要改 engine/ |

---

## 3. 防膨胀规则（代码体积控制）

### 3.1 文件体积
- 单个 `.ts/.tsx` 文件不超过 **300 行**。超过时必须拆分
- 拆分原则：按职责拆，不是按行数机械切割。一个文件只做一件事

### 3.2 函数体积
- 单个函数不超过 **50 行**。超过时提取子函数
- 函数参数不超过 **5 个**。超过时用对象参数（`options: XxxOptions`）

### 3.3 禁止预设式开发
- **不做**还没被需要的功能（"以后可能用到"）
- **不建**还没有第二个使用者的抽象（"万一别的地方也需要"）
- **不写**防御性代码来应对不可能的情况（内部模块间信任类型系统）
- 三段相似代码优于一个过早抽象。等到第三次重复时再考虑提取

### 3.4 新增文件的审批
新建文件前必须确认：
- [ ] 不能用已有文件扩展完成吗？优先改已有文件
- [ ] 新文件放在了正确的目录层吗？
- [ ] 新文件有明确的单一职责吗？能用一句话说清它干什么吗？

---

## 4. 代码卫生规则

### 4.1 死代码清理
- 不用的 import、变量、函数 — **删掉**，不要注释掉或加下划线前缀
- 不用的组件文件 — **删掉**或移到 `_deprecated/` 并在 PR 中说明
- `tsconfig` 开启了 `noUnusedLocals` 和 `noUnusedParameters`，构建会强制检查

### 4.2 注释规则
- 默认不写注释。代码本身应该是可读的
- 只在 **WHY 不显然** 时写注释：变通方案、隐藏约束、会让读者意外的行为
- 禁止写"这个函数做 XXX"式的注释（函数名应该已经说清了）
- 禁止写"为 #issue-123 添加"式的注释（这属于 git commit message）

### 4.3 命名规范
- 文件名：`camelCase.ts`（工具/引擎）、`PascalCase.tsx`（组件）
- 类型/接口：`PascalCase`
- 函数/变量：`camelCase`
- 常量：`UPPER_SNAKE_CASE`
- NPC ID：见 CLAUDE.md 的命名规范（如 `weichi_jingde` 不是 `yuchi`）

### 4.4 类型安全
- 禁止 `any`。实在没办法时用 `unknown` + 类型守卫
- LLM 返回的 JSON 必须经过 `extractJson()` + 结构验证后再使用，不得 unsafe cast
- 新增到 `WorldState` 的字段必须在 `createInitialWorldState()` 中初始化
- `restoreGame()` 加载旧存档时必须兼容新字段缺失的情况（给默认值）

---

## 5. LLM 调用规则

| 规则 | 说明 |
|------|------|
| 接口统一 | 所有 LLM 调用都通过 `LLMProvider.chat(messages, onChunk?, signal?)` |
| Prompt 与调用分离 | prompt 构建在 `*PromptBuilder.ts`（纯函数），API 调用在调用方 |
| 失败静默 | LLM 调用失败不应导致游戏崩溃，用 try/catch 兜底 |
| Token 意识 | 新增 LLM 调用前标注预估 token 量，超过 500 tokens 的需要说明理由 |
| 不阻塞 UI | 耗时 LLM 调用必须异步，不能阻塞游戏流程（参考 memoryExtractor 的 fire-and-forget 模式） |

---

## 6. 状态管理规则

| 规则 | 说明 |
|------|------|
| 世界状态集中 | 所有游戏运行时状态在 `WorldState` 中，不在组件中自行维护游戏逻辑状态 |
| 单向数据流 | WorldSimulator → notify → App.tsx → props → Components。组件通过回调向上报告用户操作 |
| 存档完整性 | 能影响游戏进程的数据都必须在 `WorldState` 中，否则刷新页面后状态丢失 |
| 存档兼容 | 新增 WorldState 字段时，`restoreGame()` 必须处理旧存档中该字段不存在的情况 |

---

## 7. 项目结构（当前实际状态）

```
xuanwumen-mvp/
├── src/
│   ├── main.tsx                          # 入口
│   ├── App.tsx                           # 唯一组装点
│   ├── types/
│   │   ├── index.ts                      # 基础类型（Character, MemoryEntry 等）
│   │   └── world.ts                      # v3.0 世界模拟类型（WorldState 等）
│   ├── data/
│   │   ├── characters/                   # 角色核心数据 + 记忆 md
│   │   ├── agents/                       # NPC 决策规则 + 幕后角色
│   │   └── skeletons/                    # 事件骨架模板
│   ├── engine/
│   │   ├── sceneManager.ts               # 场景状态机
│   │   ├── jsonExtractor.ts              # LLM 返回 JSON 提取
│   │   ├── llm/                          # LLM 适配器层
│   │   └── world/                        # v3.0 世界引擎
│   │       ├── worldSimulator.ts         # 调度中枢
│   │       ├── worldState.ts             # 状态初始化 + 存档
│   │       ├── pressure.ts               # 压力轴系统
│   │       ├── npcAgent.ts               # NPC 决策执行
│   │       ├── npcPromptBuilder.ts       # NPC 决策 prompt（纯函数）
│   │       ├── promptBuilder.ts          # 场景对话 prompt（纯函数）
│   │       ├── eventGenerator.ts         # 事件变体生成
│   │       ├── eventRunner.ts            # 事件→场景适配
│   │       ├── memoryExtractor.ts        # 场景记忆提取
│   │       ├── activities.ts             # 日常活动
│   │       ├── calendar.ts               # 日历系统
│   │       └── __tests__/               # 单元测试
│   └── components/                       # UI 组件（只接 props，不碰引擎）
```

---

## 8. 自检清单（每次改动前过一遍）

### 分层
- [ ] 我要改的文件在哪一层？它只 import 了允许的层吗？
- [ ] 如果是 component，数据是通过 props/context 来的，还是直接 import 了 data/ 或 engine/？
- [ ] 新文件放在了正确的目录吗？

### 体积
- [ ] 修改后文件是否超过 300 行？如果是，该拆分了
- [ ] 新增的函数是否超过 50 行？如果是，该提取子函数了
- [ ] 是否在做"以后可能用到"的功能？如果是，停下来

### 卫生
- [ ] 有没有引入未使用的 import/变量？`npm run build` 会报错
- [ ] LLM 返回值是否做了 extractJson + 结构验证？
- [ ] 新增 WorldState 字段是否在 createInitialWorldState 和 restoreGame 中都处理了？

### 安全
- [ ] LLM 调用有 try/catch 吗？失败时不会崩溃吗？
- [ ] 异步操作会不会阻塞 UI？

---

## 9. 违反规则时的处理

如果发现现有代码已经违反上述规则：
1. **告知用户**具体违规点和影响
2. **给出修复方案**
3. 小违规随手修，大违规单独处理（不要把修复混进功能开发的改动里）
