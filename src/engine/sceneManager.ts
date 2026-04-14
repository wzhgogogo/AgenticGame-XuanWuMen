import type {
  GameState, DialogueEntry, SceneConfig, Character, PhaseConfig,
} from '../types';
import type { LLMProvider } from './llm/types';
import { buildSystemPrompt, buildMessages, buildFirstNpcMessage } from './promptBuilder';

// ===== 工具函数 =====

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ===== 类型 =====

type StateListener = (state: GameState) => void;

// ===== SceneManager =====

export class SceneManager {
  private state: GameState;
  private listeners: Set<StateListener> = new Set();
  private llmProvider: LLMProvider;
  private scene: SceneConfig;
  private npcs: Character[];
  private player: Character;
  private systemPrompt: string;
  private previousSceneSummary?: string;

  constructor(
    llmProvider: LLMProvider,
    scene: SceneConfig,
    npcs: Character[],
    player: Character,
    previousSceneSummary?: string,
  ) {
    this.llmProvider = llmProvider;
    this.scene = scene;
    this.npcs = npcs;
    this.player = player;
    this.previousSceneSummary = previousSceneSummary;

    this.state = {
      status: 'intro',
      dialogueHistory: [],
      llmMessages: [],
      playerTurnCount: 0,
      currentPhaseIndex: 0,
      isNpcThinking: false,
      endingText: undefined,
    };

    this.systemPrompt = buildSystemPrompt(
      scene,
      [player, ...npcs],
      0,
      previousSceneSummary,
    );
  }

  // --- 只读访问 ---

  getState(): GameState {
    return this.state;
  }

  // --- 订阅状态变更 ---

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // --- 公共方法 ---

  getSuggestedActions(): string[] {
    return this.getCurrentPhase().suggestedActions;
  }

  // --- 游戏流程控制 ---

  async startGame(): Promise<void> {
    // 1. 添加旁白
    this.addDialogueEntry({
      type: 'narrator',
      content: this.scene.narratorIntro,
    });

    // 2. 切换到 playing 状态
    this.setState({ status: 'playing' });

    // 3. 请求第一轮 NPC 发言
    const firstMsg = buildFirstNpcMessage(this.scene);
    // 加入 llmMessages（玩家看不到这条引导消息）
    this.state.llmMessages.push({ role: 'user', content: firstMsg.content });
    await this.requestNpcResponse(firstMsg.content, true);
  }

  async submitPlayerAction(input: string): Promise<void> {
    // 前置检查
    if (this.state.isNpcThinking || this.state.status !== 'playing') {
      return;
    }

    let playerInput = input;

    // 处理空输入
    if (!input.trim()) {
      playerInput = '（秦王沉默不语）';
      this.addDialogueEntry({
        type: 'scene_action',
        content: '秦王沉默不语，目光在烛火间游移。',
      });
    } else {
      // 正常输入
      this.addDialogueEntry({
        type: 'player',
        speaker: this.player.id,
        speakerName: this.player.name,
        content: playerInput,
        color: this.player.color,
      });
    }

    // playerTurnCount++
    this.setState({ playerTurnCount: this.state.playerTurnCount + 1 });

    // 更新 currentPhaseIndex
    const turnCount = this.state.playerTurnCount;
    for (let i = 0; i < this.scene.phases.length; i++) {
      const [min, max] = this.scene.phases[i].turnRange;
      if (turnCount >= min && turnCount <= max) {
        if (i !== this.state.currentPhaseIndex) {
          this.setState({ currentPhaseIndex: i });
          // 重建 systemPrompt 以反映新阶段
          this.systemPrompt = buildSystemPrompt(
            this.scene,
            [this.player, ...this.npcs],
            i,
            this.previousSceneSummary,
          );
        }
        break;
      }
    }

    // 请求 NPC 响应
    await this.requestNpcResponse(playerInput, false);
  }

  // --- 内部方法 ---

  private setState(partial: Partial<GameState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const fn of this.listeners) {
      fn(this.state);
    }
  }

  private addDialogueEntry(entry: Omit<DialogueEntry, 'id' | 'timestamp'>): void {
    const fullEntry: DialogueEntry = {
      ...entry,
      id: generateId(),
      timestamp: Date.now(),
    };
    this.state = {
      ...this.state,
      dialogueHistory: [...this.state.dialogueHistory, fullEntry],
    };
    this.notifyListeners();
  }

  private getCurrentPhase(): PhaseConfig {
    return this.scene.phases[this.state.currentPhaseIndex]
      || this.scene.phases[this.scene.phases.length - 1];
  }

  private shouldTriggerEnding(playerInput?: string): boolean {
    if (this.state.playerTurnCount >= this.scene.endingTrigger.minTurns) {
      return true;
    }
    // 玩家明确表达终结意图时，允许提前触发结局（至少过了一半回合）
    if (playerInput && this.state.playerTurnCount >= Math.floor(this.scene.endingTrigger.minTurns / 2)) {
      const endingPatterns = [
        '准备', '动手', '出发', '行动', '决定了', '就这么办',
        '下令', '传令', '各自', '散了', '不再犹豫', '誓',
        '放弃', '不干了', '算了', '罢了', '投降', '归顺',
      ];
      const input = playerInput.trim();
      if (endingPatterns.some((p) => input.includes(p))) {
        return true;
      }
    }
    return false;
  }

  private async requestNpcResponse(playerInput: string, isFirstTurn: boolean): Promise<void> {
    this.setState({ isNpcThinking: true });

    // 添加玩家消息到 llmMessages（首轮已经在 startGame 中添加了）
    if (!isFirstTurn) {
      this.state.llmMessages.push({ role: 'user', content: playerInput });
    }

    // 判断是否进入结局
    const isEnding = this.shouldTriggerEnding(isFirstTurn ? undefined : playerInput);

    // 构建完整消息数组
    const messages = buildMessages(
      this.systemPrompt,
      this.state.llmMessages,
      isEnding,
    );

    let fullResponse = '';

    try {
      const response = await this.llmProvider.chat(messages, (chunk: string) => {
        fullResponse += chunk;
      });

      fullResponse = response.content;
    } catch (error) {
      console.error('[SceneManager] LLM 请求失败:', error);
      const errMsg = (error as { message?: string })?.message || String(error);
      this.addDialogueEntry({
        type: 'scene_action',
        content: `夜风忽起，烛火明灭不定……（${errMsg}）`,
      });
      this.setState({ isNpcThinking: false });
      // 移除刚才加的 user 消息，让玩家可以重试
      this.state.llmMessages.pop();
      return;
    }

    // 解析响应
    const parsed = this.parseNpcResponse(fullResponse);

    // 添加解析后的 entries 到对话历史
    this.state = {
      ...this.state,
      dialogueHistory: [...this.state.dialogueHistory, ...parsed.entries],
    };
    this.notifyListeners();

    // 记录到 llmMessages
    this.state.llmMessages.push({ role: 'assistant', content: fullResponse });

    // 检查结局
    if (parsed.ending) {
      this.setState({
        status: 'ending',
        endingText: parsed.ending,
        isNpcThinking: false,
      });
      return;
    }

    this.setState({ isNpcThinking: false });
  }

  /** 从 LLM 原始输出中提取 JSON 字符串，处理思考文本、markdown 包裹和截断 */
  private extractJson(raw: string): string | null {
    let str = raw.trim();

    // 如果有 ```json ... ``` 包裹，先提取其中内容
    const codeBlockMatch = str.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (codeBlockMatch) {
      str = codeBlockMatch[1].trim();
    }

    // 找到第一个 { 的位置
    const start = str.indexOf('{');
    if (start === -1) return null;

    // 从第一个 { 开始，用括号计数找到匹配的 }
    let braces = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < str.length; i++) {
      const ch = str[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') braces++;
      else if (ch === '}') braces--;
      if (braces === 0) {
        // 找到完整的 JSON 对象
        const jsonStr = str.slice(start, i + 1);
        try {
          JSON.parse(jsonStr);
          return jsonStr;
        } catch {
          return null;
        }
      }
    }

    // 括号没闭合（截断），尝试修补
    let truncated = str.slice(start);
    braces = 0;
    let brackets = 0;
    inString = false;
    escape = false;
    for (const ch of truncated) {
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') braces++;
      else if (ch === '}') braces--;
      else if (ch === '[') brackets++;
      else if (ch === ']') brackets--;
    }
    if (inString) truncated += '"';
    for (let i = 0; i < brackets; i++) truncated += ']';
    for (let i = 0; i < braces; i++) truncated += '}';

    try {
      JSON.parse(truncated);
      return truncated;
    } catch {
      return null;
    }
  }

  private parseNpcResponse(raw: string): { entries: DialogueEntry[]; ending?: string } {
    const entries: DialogueEntry[] = [];
    let ending: string | undefined;

    // 尝试 JSON 解析（LLM 被要求输出 JSON 格式）
    const jsonStr = this.extractJson(raw);
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);

        // narrator
        if (parsed.narrator) {
          entries.push({
            id: generateId(),
            type: 'narrator',
            content: parsed.narrator,
            timestamp: Date.now(),
          });
        }

        // npcDialogues
        if (Array.isArray(parsed.npcDialogues)) {
          for (const d of parsed.npcDialogues) {
            const npc = this.npcs.find((n) => n.id === d.characterId)
              || this.npcs.find((n) => n.name === d.characterId);
            entries.push({
              id: generateId(),
              type: 'npc',
              speaker: npc?.id || d.characterId,
              speakerName: npc?.name || d.characterId,
              content: d.content,
              color: npc?.color,
              timestamp: Date.now(),
            });
          }
        }

        // ending
        if (parsed.ending) {
          ending = parsed.ending;
          entries.push({
            id: generateId(),
            type: 'narrator',
            content: parsed.ending,
            timestamp: Date.now(),
          });
        }

        return { entries, ending };
      } catch {
        // JSON 仍然无法解析，继续到文本回退
      }
    }

    // 回退：文本格式解析
    const lines = raw.split('\n');
    let currentEntry: DialogueEntry | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 匹配 **XXX**：或 **XXX**: 格式
      const npcMatch = trimmed.match(/^\*\*(.+?)\*\*[：:]\s*(.*)$/);
      if (npcMatch) {
        if (currentEntry) entries.push(currentEntry);
        const name = npcMatch[1];
        const content = npcMatch[2];
        const npc = this.npcs.find((n) => n.name === name);
        currentEntry = {
          id: generateId(),
          type: 'npc',
          speaker: npc?.id || name,
          speakerName: npc?.name || name,
          content,
          color: npc?.color,
          timestamp: Date.now(),
        };
        continue;
      }

      // 匹配 *xxx* 动作描写
      const actionMatch = trimmed.match(/^\*(.+)\*$/);
      if (actionMatch) {
        if (currentEntry) entries.push(currentEntry);
        currentEntry = null;
        entries.push({
          id: generateId(),
          type: 'scene_action',
          content: actionMatch[1],
          timestamp: Date.now(),
        });
        continue;
      }

      // 其他内容：追加到当前 entry 或创建旁白
      if (currentEntry) {
        currentEntry.content += '\n' + trimmed;
      } else {
        entries.push({
          id: generateId(),
          type: 'narrator',
          content: trimmed,
          timestamp: Date.now(),
        });
      }
    }

    if (currentEntry) entries.push(currentEntry);

    return { entries, ending };
  }
}
