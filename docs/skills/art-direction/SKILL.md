---
name: art-direction
description: 玄武门2.0电影叙事风美术设计方案——视觉系统定义、布局规范、资产管线、实施路线，开发UI/组件前必读
---

# Art Direction —  电影叙事风美术设计方案

本方案定义游戏的视觉方向、布局结构、核心系统、资产规范和实施路线。所有 UI/组件开发**必须遵循本方案**。

**范围**：仅 PC 网页端，不考虑移动端适配。

---

## 1. 视觉定位

**一句话定位：《长安十二时辰》遇上互动电影**

| 维度 | 定义 |
|------|------|
| 色调 | 暗金色调 — 烛火暖黄 + 深黑/靛蓝阴影，高对比低饱和 |
| 质感 | 电影胶片感 — 微噪点、暗角、景深模糊 |
| 构图 | 全屏利用 + vignette 暗角模拟电影感（不加 letterbox 遮幅，保留垂直空间给文字） |
| 字体 | 衬线体为主（正文），书法体点缀（标题/转场） |
| 动效 | 克制而有力 — 慢淡入、缓推镜、呼吸光效，拒绝花哨 |

参考气质：长安十二时辰（色调/光影）、80 Days（互动叙事 UI）、Disco Elysium（对话系统深度）、Firewatch（环境叙事）

---

## 2. 画面布局

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │     场景背景 (全屏 + vignette 暗角)          │    │
│  │                                             │    │
│  │         时间 · 地点 (浮动半透明)              │    │
│  │                                             │    │
│  │                                             │    │
│  │    ┌─────────────────────────────────┐      │    │
│  │    │  毛玻璃对话面板 (glass-panel)     │      │    │
│  │    │  角色名          [1/5]          │      │    │
│  │    │  台词文本                        │      │    │
│  │    │              ▼                  │      │    │
│  │    └─────────────────────────────────┘      │    │
│  │    ┌─────────────────────────────────┐      │    │
│  │    │  [选项A卡片]    [选项B卡片]       │      │    │
│  │    │  [自由输入...]              →    │      │    │
│  │    └─────────────────────────────────┘      │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**关键决策：**
- 不加 letterbox 黑边遮幅（文字量大，需要垂直空间），改用 vignette 暗角模拟电影感
- 背景全屏铺底，5 层叠加（渐变底色 + 阶段色调 + 烛光呼吸 + SVG 噪点 + 暗角）
- 对话面板在中下方，毛玻璃效果 (`glass-panel` = `rgba(10,10,15,0.85)` + `backdrop-filter: blur(12px)`)
- 玩家选项在底部，2 列网格卡片 + 金色细边框
- 旁白全屏居中大字显示，金色分隔线装饰

---

## 3. 核心视觉系统

### 3.1 场景背景系统

5 层叠加（从底到顶）：
1. **主背景图** — AI 生成场景画 (1920x1080 webp)
2. **色调滤镜层** — CSS `mix-blend-mode`，按阶段变色：
   - 阶段1 危机揭示：冷靛蓝 `rgba(20,30,60,0.3)`
   - 阶段2 激辩定策：暖琥珀 `rgba(60,40,15,0.25)`
   - 阶段3 最终决断：深红金 `rgba(80,20,10,0.2)`
3. **动态光效层** — CSS 径向渐变模拟烛光，呼吸动画
4. **噪点纹理层** — 半透明 base64 noise texture，胶片感
5. **暗角层** — `box-shadow: inset` 大范围暗角

阶段转换：色调层 `transition: background-color 3s ease`。

**组件**：`src/components/SceneBackground.tsx`
**数据扩展**：SceneConfig 增加 `backgroundUrl`、`phaseColorOverlays`

### 3.2 角色立绘系统

- 绝对定位于场景左侧 15%-45% 宽度，底部对齐
- 默认 opacity 0.6（暗化），说话时 opacity 1 + scale 1.02
- 切换角色：前一个淡出 (0.5s) + 新角色淡入 (0.5s)
- 每角色可有 2-3 个表情变体（neutral / angry / worried），由 LLM emotion 字段切换

**资产**：每角色 1 张基础立绘 (透明背景 PNG/WebP, ~600x900)
**组件**：`src/components/CharacterPortrait.tsx`
**数据扩展**：Character 增加 `portraits: { neutral: string; angry?: string; ... }`

### 3.3 对话面板

**核心变化：从"聊天流"到"电影台词面板"**

不再是滚动消息列表，改为**单条对话展示** + 翻页浏览：

```
┌─────────────────────────────────────┐
│  长孙无忌                    [1/5]  │
│                                     │
│  殿下，太子今夜在东宫设宴，         │
│  名为庆功，实则——                   │
│  （压低声音，目光扫过窗外）          │
│  臣已探知，席间将有伏兵。           │
│                                     │
│              ▼                      │
└─────────────────────────────────────┘
```

- 毛玻璃面板 (`glass-panel`)
- 角色名字用角色专属色 + `letter-spacing: 0.1em`
- 台词大号衬线体 (1.05rem)
- `（动作描写）` 渲染为斜体灰色（正则替换中英文括号）
- `▼` 提示点击继续，`[1/5]` 显示进度
- 空格键/方向键/点击翻页

**旁白**：全屏居中大字，无面板框，金色分隔线上下装饰，配合背景微推镜 (`scale 1→1.02, 5s`)

**历史回看**：侧边滑出抽屉，列表式紧凑排版

**组件**：`src/components/DialoguePanel.tsx`（替代 DialogueFlow.tsx）、`src/components/DialogueHistory.tsx`
**Hook**：`src/hooks/useTypewriter.ts`

### 3.4 玩家交互面板

从"输入框+按钮"到"抉择卡片"：

```
┌────────────────┐ ┌────────────────┐
│  询问太子的      │ │  立刻调兵        │
│  具体计划        │ │  包围东宫        │
├────────────────┤ ├────────────────┤
│  稳妥之策        │ │  果断之策        │
└────────────────┘ └────────────────┘
        ┌──────────────────────┐
        │  以秦王的身份说……    →│
        └──────────────────────┘
```

- 2 列网格卡片，深色底 + 金色细边框
- 每张卡片：主文案 + 小字标签（稳妥/果断/隐忍/激进）
- 自由输入在底部，视觉次要
- hover 时边框亮起 + 微放大，选中后闪烁确认 → 淡出

**数据扩展**：`suggestedActions` 从 `string[]` → `{ text: string; tag?: string }[]`

### 3.5 转场与阶段系统

阶段转场流程：
```
[画面暗化 1s] → [全屏黑底，书法大字渐现] → [停留 2s] → [背景色调切换，新背景渐现]
```

其他转场：
- 游戏开始：标题画面 → 黑幕 → 场景渐现 → 旁白入场
- 游戏结局：对话面板消失 → 背景微推镜 → 全屏结局文字滚动（电影 credits 式）

**组件**：`src/components/PhaseTransition.tsx`、`src/components/CinematicIntro.tsx`

### 3.6 开场画面

电影海报式：
- 背景：场景图高斯模糊 + 暗角 + 缓慢推镜 (`scale 1→1.05, 20s`)
- 标题：书法字体 (Ma Shan Zheng)，3-4rem，金色 `text-shadow` 发光
- 英文副标题：小号衬线体，`letter-spacing: 0.3em`
- 分隔线：渐变金线 (transparent → gold → transparent)
- 开始按钮：宽矩形，金色边框，hover 发光扩散
- 入场动画：背景先行 → 标题淡入(1s) → 副标题(+0.5s) → 分隔线(+0.5s) → 按钮(+1s)

### 3.7 音频系统（架构预埋）

- `src/engine/audioManager.ts` — 单例，管理 BGM + SFX
- BGM：按阶段切换不同曲目（crossfade 过渡）
- SFX 触发点：书写笔触音（文字显现时）、选项点击、阶段转场鼓声、结局音效
- 首次用户交互后启动（浏览器 autoplay 策略）

---

## 4. 动效规范

| 动效 | 时长 | 曲线 | 用途 |
|------|------|------|------|
| 淡入淡出 | 0.5-1s | ease-out | 对话切换、角色出入 |
| 逐字书写 | 40ms/字 | linear | NPC/旁白文字逐字显现，配书写笔触音 |
| 烛光呼吸 | 4-6s | ease-in-out | 背景光效循环 |
| 阶段转场 | 3-4s total | ease | 暗化→标题→亮起 |
| 推镜效果 | 5-20s | linear | 背景微缩放，营造动态感 |
| 悬停反馈 | 0.2s | ease | 按钮/卡片 hover |
| 色调过渡 | 3s | ease | 阶段色调切换 |

**原则**：所有动效可被用户通过 `prefers-reduced-motion` 关闭。

---

## 5. 资产生产管线

### AI 生成工作流

| 资产类型 | 工具推荐 | 规格 | 数量（当前场景） |
|----------|----------|------|-----------------|
| 场景背景 | Midjourney / FLUX | 1920x1080 webp | 1 张 + 阶段变体可选 |
| 角色立绘 | Midjourney / 通义万相 | 600x900 透明底 webp/png | 4 张（各1基础） |
| 角色表情变体 | 同上 + 局部重绘 | 同上 | 每角色 2-3 张（可选） |
| 噪点纹理 | Photoshop / CSS 生成 | 200x200 tileable | 1 张 |
| UI 装饰元素 | SVG 手写 / AI | 矢量 | 按需 |

**风格统一 prompt 关键词**：
> Tang Dynasty, cinematic lighting, dark moody interior, candlelight,
> Chinese ink painting meets film concept art, muted gold and indigo palette,
> 8th century Chang'an architecture, silk textures, bronze details

### 资产目录
```
public/
├── scenes/
│   └── midnight-council.webp
├── characters/
│   ├── changsun-wuji-neutral.webp
│   ├── changsun-wuji-angry.webp
│   ├── weichi-jingde-neutral.webp
│   ├── fang-xuanling-neutral.webp
│   └── li-shimin-neutral.webp
├── ui/
│   └── noise-texture.png
└── audio/
    ├── bgm/
    └── sfx/
```

---

## 6. 实施路线（3 个 Sprint）

### Sprint 1："骨架搭建"（视觉框架 + 布局大改）✅ 已完成
> 目标：画面从"聊天窗口"变成"电影画面"，即使没有真实资产也能感受到框架变化

1. ✅ **场景背景系统** — SceneBackground 组件，5 层叠加（CSS 渐变底色 + 阶段色调 + 烛光呼吸 + SVG feTurbulence 噪点 + vignette 暗角）
2. ✅ **画面布局重构** — 从 3 段式 flex 改为全屏场景 + 浮动毛玻璃面板布局
3. ✅ **对话面板重设计** — DialoguePanel：单条展示 + 翻页浏览（空格/方向键/点击），括号动作斜体渲染
4. ✅ **交互卡片化** — ActionPanel 从横排按钮改为 2 列网格卡片 + 金色细边框
5. ✅ **开场画面** — 电影海报式标题（Ma Shan Zheng 书法字体 + 金色 text-shadow + stagger 入场动画）
6. ✅ **暗角系统** — vignette 替代 letterbox 遮幅（保留垂直空间给文字）
7. ✅ **全局视觉统一** — 所有屏幕加 SceneBackground + 金色边框按钮 + glass-panel 样式
8. ✅ **动效降级** — `prefers-reduced-motion` 关闭所有动画

**已修改文件**：
- 新建：`SceneBackground.tsx`, `DialoguePanel.tsx`
- 重写：`GameScene.tsx`, `ActionPanel.tsx`, `EndingScreen.tsx`, `DailyActivityScreen.tsx`, `DailyBriefingScreen.tsx`, `TransitionScreen.tsx`
- 修改：`App.tsx`（标题画面 + 加载/错误画面）, `index.css`（字体/动画/glass-panel）, `index.html`（Ma Shan Zheng 字体引入）
- 未删除：`DialogueFlow.tsx`, `NarratorPanel.tsx`（保留但 GameScene 不再引用）

### Sprint 2："血肉填充"（资产集成 + 动效打磨）
> 目标：有了真实的角色立绘和场景图后，体验质变

1. **AI 生成资产** — 场景背景 + 4 角色立绘（需要用户参与生图审核）
2. **角色立绘系统** — CharacterPortrait 组件 + 淡入淡出切换 + 说话高亮
3. **阶段转场** — PhaseTransition 全屏过渡动画
4. **逐字书写效果** — useTypewriter hook + 对话逐字显现 + 配合书写笔触音效
5. **烛光 + 噪点** — 动态光效 + 胶片质感纹理
6. **色调系统** — 按阶段自动切换色调滤镜
7. **括号动作解析** — `（动作描写）` 渲染为斜体灰色

**新建文件**：
- `CharacterPortrait.tsx`, `PhaseTransition.tsx`, `useTypewriter.ts`
- `public/scenes/`, `public/characters/` 资产目录

### Sprint 3："灵魂注入"（音频 + 情绪 + 细节抛光）
> 目标：从"能看"到"想玩完"

1. **音频基础设施** — audioManager + BGM/SFX 触发 + 音量控制
2. **LLM 情绪扩展** — NPC 对话返回 emotion 字段 → 立绘表情切换 + UI 微调
3. **开场过场动画** — CinematicIntro 组件（点击"开始"后的叙事序列）
4. **结局电影感** — 重新设计 EndingScreen（推镜 + 文字滚动 + 音乐）
5. **对话历史抽屉** — 侧滑面板回看完整对话记录
6. **性能优化** — 图片 lazy load、动画 GPU 加速、prefers-reduced-motion
7. **细节打磨** — loading 状态、错误态、边缘 case

---

## 7. 技术约束

- **零新 npm 依赖** — 全部用 CSS + 原生 API + React hooks
- **保持 SceneManager 架构** — 只改组件层和类型层，不改引擎层
- **资产按需加载** — 背景图 eager，角色立绘在 GameScene mount 时预加载
- **CSS 变量驱动主题** — 色调/光效通过 CSS custom properties 控制
- **可降级** — 无图片时退回纯 CSS 渐变背景，无音频时静默运行
- **遵守 arch-guard 分层规则** — 新组件放 components/，新 hook 放 hooks/，audioManager 放 engine/

---

## 8. 自检清单

开发 UI 组件前对照：

- [ ] 视觉风格是否符合"暗金+电影感"定位？拒绝高饱和、花哨、游戏化方向
- [ ] 布局是否遵循全屏场景 + 浮动面板结构（而非传统 flex 分段）？
- [ ] 新增资产是否放在正确的 public/ 子目录？
- [ ] 动效是否克制（慢淡入、缓推镜）？有没有过度动画？
- [ ] 是否支持 `prefers-reduced-motion` 降级？
- [ ] 无资产时能否正常降级为 CSS 渐变？
