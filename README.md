# 玄武门之变 — LLM 驱动的历史互动叙事游戏

v1.0 MVP

## 简介

以武德九年六月初三夜为背景，玩家扮演秦王李世民，在密室中与长孙无忌、尉迟敬德、房玄龄三位核心幕僚进行一场改变大唐命运的密议。

LLM 实时生成 NPC 对话与旁白，玩家的每一句话都会影响剧情走向和最终结局。

## 技术栈

- React + TypeScript + Vite
- Tailwind CSS v4
- Bun 运行时
- LLM：OpenAI 兼容接口（支持 Gemini、DeepSeek、Moonshot、通义千问、智谱等）

## 快速开始

```bash
# 安装依赖
bun install

# 配置 LLM（编辑 .env）
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

## 项目结构

```
src/
├── types/index.ts              # 全局类型定义
├── data/
│   ├── characters/             # 角色数据（一人一文件，便于扩展）
│   │   ├── index.ts            # 汇总导出 + 辅助函数
│   │   ├── liShimin.ts         # 李世民（玩家角色）
│   │   ├── changSunWuji.ts     # 长孙无忌
│   │   ├── weiChiJingDe.ts     # 尉迟敬德
│   │   └── fangXuanLing.ts     # 房玄龄
│   └── scenes/                 # 场景配置（一场景一文件，便于扩展）
│       ├── index.ts            # 汇总导出 + getSceneById + defaultScene
│       └── midnightCouncil.ts  # 秦王府密室密议
├── engine/
│   ├── llm/                    # LLM 适配器层
│   │   ├── types.ts            # LLMProvider 接口定义
│   │   ├── registry.ts         # Provider 注册中心
│   │   ├── openai.ts           # OpenAI 兼容适配器
│   │   ├── anthropic.ts        # Anthropic 适配器
│   │   ├── sseParser.ts        # SSE 流式解析
│   │   └── index.ts            # 注册内置 providers 并导出
│   ├── promptBuilder.ts        # System prompt 组装（纯函数）
│   └── sceneManager.ts         # 场景引擎（状态机 + 观察者模式）
├── components/
│   ├── NarratorPanel.tsx       # 顶部场景信息栏
│   ├── DialogueFlow.tsx        # 对话流（旁白/NPC/玩家/动作 4 种渲染）
│   ├── ActionPanel.tsx         # 底部操作面板（预设选项 + 自由输入）
│   ├── EndingScreen.tsx        # 结局画面
│   └── GameScene.tsx           # 游戏场景容器
├── App.tsx                     # 入口：开屏 → 游戏 → 结局 → 重开
└── index.css                   # 全局样式（字体、滚动条、动画）
```

## v1.0 已实现

### 核心功能
- 完整的开屏 → 密议 → 结局游戏循环
- LLM 实时生成旁白 + 多 NPC 对话（JSON 格式输出，含文本 fallback）
- 3 阶段剧情推进：危机揭示 → 激辩定策 → 最终决断
- 预设行动建议 + 自由文本输入
- 结局触发：回合数达标自动触发，或玩家表达决断意图时提前触发
- 结局文本显示 + 复制 + 重开

### 架构设计
- 分层架构：types → data → engine → components → App
- LLM 适配器注册表模式，一套代码支持多家 API
- SceneManager 状态机 + 观察者模式，UI 与逻辑解耦
- 纯函数 prompt 构建，无副作用
- SSE 流式接收 LLM 响应

### 已修复的问题
- 流式输出时不再显示原始 JSON，等完整响应后解析渲染
- JSON 提取器兼容模型前置思考文本（如 gemma4）、markdown 代码块包裹、截断修补
- 用括号计数精确提取 JSON 对象，不受前后非 JSON 内容干扰
- 对话滚动只在新条目出现时触发，避免流式更新时卡顿
- 预设选项移动端横向滚动不换行
- maxTokens 从 1024 调至 4096，避免 JSON 响应被截断
- 错误信息透出具体 LLM 错误原因（控制台 + UI），便于排查
- 结局支持语义提前触发（玩家表达决断意图时，>=5 轮即可触发）
- 角色数据拆分为独立文件（characters/），便于逐个 review 和扩展
- 场景数据拆分为独立文件（scenes/），便于后续添加新场景
- NPC 颜色统一：长孙无忌 #5DCAA5、尉迟敬德 #E24B4A、房玄龄 #EF9F27
- 移除不必要的 SettingsModal，LLM 配置完全通过 .env 管理

## 后续规划

详见 [TODO-optimization.md](TODO-optimization.md)

### 性能优化
- 精简 system prompt，减少输入 tokens
- 对话历史滑窗 + 摘要压缩
- 模型自动降级（限流时切换备用模型）

### 体验增强
- 美术资源（角色立绘、场景背景）
- 音效与背景音乐
- 对话打字机动画效果
- 移动端适配优化

### 内容打磨
- 角色数据 review（性格、台词风格、历史细节）
- 更多场景与分支剧情
- 多结局丰富度
