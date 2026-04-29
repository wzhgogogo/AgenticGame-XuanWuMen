import type { GameState, DialogueEntry, SceneConfig, Character, PhaseConfig } from '../types';
import type { LLMProvider } from './llm/types';
import type { WorldState, PlayerAction } from '../types/world';
import type { GameLogger } from './world/gameLogger';
import { buildSystemPrompt, buildMessages, buildFirstNpcMessage } from './world/promptBuilder';
import { extractJson, stripThinkingTags } from './jsonExtractor';
import { debugLog } from './debugLog';

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
  private relationshipOverrides?: WorldState['relationshipOverrides'];
  private recentPlayerActions?: PlayerAction[];
  private logger?: GameLogger;
  private logDay = 0;
  private logDateStr = '';

  constructor(
    llmProvider: LLMProvider,
    scene: SceneConfig,
    npcs: Character[],
    player: Character,
    previousSceneSummary?: string,
    relationshipOverrides?: WorldState['relationshipOverrides'],
    recentPlayerActions?: PlayerAction[],
  ) {
    this.llmProvider = llmProvider;
    this.scene = scene;
    this.npcs = npcs;
    this.player = player;
    this.previousSceneSummary = previousSceneSummary;
    this.relationshipOverrides = relationshipOverrides;
    this.recentPlayerActions = recentPlayerActions;

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
      relationshipOverrides,
      recentPlayerActions,
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

  setLogger(logger: GameLogger, day: number, dateStr: string): void {
    this.logger = logger;
    this.logDay = day;
    this.logDateStr = dateStr;
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
    this.setState({ llmMessages: [...this.state.llmMessages, { role: 'user', content: firstMsg.content }] });
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
    this.logger?.log(this.logDay, this.logDateStr, 'player_input', {
      turn: this.state.playerTurnCount, input: playerInput,
    });

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
            this.relationshipOverrides,
            this.recentPlayerActions,
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
    const { minTurns, maxTurns } = this.scene.endingTrigger;
    const turns = this.state.playerTurnCount;

    // 硬上限：强制结局
    if (turns >= maxTurns) {
      return true;
    }

    if (playerInput) {
      const input = playerInput.trim();

      // 散场类：玩家明确要结束，不受回合数限制
      const dismissPatterns = [
        '下去', '退下', '散去', '就这样', '到此为止', '先退下',
        '散了', '放弃', '不干了', '算了', '罢了', '投降', '归顺',
      ];
      if (dismissPatterns.some((p) => input.includes(p))) {
        return true;
      }

      // 决策类：需要足够回合铺垫
      if (turns >= Math.floor(minTurns / 2)) {
        const decisionPatterns = [
          '准备', '动手', '出发', '行动', '决定了', '就这么办',
          '下令', '传令', '各自', '不再犹豫', '誓',
        ];
        if (decisionPatterns.some((p) => input.includes(p))) {
          return true;
        }
      }
    }

    return false;
  }

  private async requestNpcResponse(playerInput: string, isFirstTurn: boolean): Promise<void> {
    this.setState({ isNpcThinking: true });

    // 添加玩家消息到 llmMessages（首轮已经在 startGame 中添加了）
    if (!isFirstTurn) {
      this.setState({ llmMessages: [...this.state.llmMessages, { role: 'user', content: playerInput }] });
    }

    // 判断是否进入结局
    const isEnding = this.shouldTriggerEnding(isFirstTurn ? undefined : playerInput);
    const isSoftEnding = !isEnding && this.state.playerTurnCount >= this.scene.endingTrigger.minTurns;

    // 构建完整消息数组
    const messages = buildMessages(
      this.systemPrompt,
      this.state.llmMessages,
      isEnding,
      isSoftEnding,
      this.scene.time,
    );

    let fullResponse = '';

    try {
      debugLog('llm_call', `场景对话`, `System prompt (前200字):\n${this.systemPrompt.slice(0, 200)}...\n\n玩家输入: ${playerInput}`);
      const response = await this.llmProvider.chat(messages, (chunk: string) => {
        fullResponse += chunk;
      });

      // streaming 回调可能未被调用（某些 provider 不走回调），以返回值兜底
      if (!fullResponse) {
        fullResponse = response.content;
      }
    } catch (error) {
      console.error('[SceneManager] LLM 请求失败:', error);
      const errMsg = (error as { message?: string })?.message || String(error);
      this.addDialogueEntry({
        type: 'scene_action',
        content: `夜风忽起，烛火明灭不定……（${errMsg}）`,
      });
      this.setState({ isNpcThinking: false });
      // 移除刚才加的 user 消息，让玩家可以重试
      this.setState({ llmMessages: this.state.llmMessages.slice(0, -1) });
      return;
    }

    // 解析响应
    debugLog('llm_call', `场景LLM返回`, fullResponse.slice(0, 500));
    this.logger?.logLLMCall('scene_dialogue', {
      sceneName: this.scene.id, turn: this.state.playerTurnCount, day: this.logDay,
    }, fullResponse);
    const parsed = this.parseNpcResponse(fullResponse);

    // 添加解析后的 entries 到对话历史
    this.state = {
      ...this.state,
      dialogueHistory: [...this.state.dialogueHistory, ...parsed.entries],
    };
    this.notifyListeners();

    this.logger?.log(this.logDay, this.logDateStr, 'scene_dialogue', {
      turn: this.state.playerTurnCount,
      entries: parsed.entries.map(e => ({ type: e.type, speaker: e.speaker || e.speakerName, content: e.content })),
    });

    // 记录到 llmMessages（去除思考标签）
    this.setState({ llmMessages: [...this.state.llmMessages, { role: 'assistant', content: stripThinkingTags(fullResponse) }] });

    // 检查结局
    if (parsed.ending) {
      this.logger?.log(this.logDay, this.logDateStr, 'scene_ending', {
        ending: parsed.ending, chosenOutcome: parsed.chosenOutcome,
      });
      this.setState({
        status: 'ending',
        endingText: parsed.ending,
        chosenOutcome: parsed.chosenOutcome,
        isNpcThinking: false,
      });
      return;
    }

    this.setState({ isNpcThinking: false });
  }

  private parseNpcResponse(raw: string): { entries: DialogueEntry[]; ending?: string; chosenOutcome?: 'success' | 'partial' | 'failure' | 'disaster' } {
    const entries: DialogueEntry[] = [];
    let ending: string | undefined;
    let chosenOutcome: 'success' | 'partial' | 'failure' | 'disaster' | undefined;

    // 尝试 JSON 解析（LLM 被要求输出 JSON 格式）
    const jsonStr = extractJson(raw);
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);

        // narrator
        if (parsed.narrator) {
          const cleaned = stripThinkingTags(parsed.narrator);
          if (cleaned) {
            entries.push({
              id: generateId(),
              type: 'narrator',
              content: cleaned,
              timestamp: Date.now(),
            });
          }
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
              content: stripThinkingTags(d.content),
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

        // chosenOutcome（v3.4.4）：LLM 在结局时返回的 outcome 标签
        if (parsed.chosenOutcome && ['success', 'partial', 'failure', 'disaster'].includes(parsed.chosenOutcome)) {
          chosenOutcome = parsed.chosenOutcome;
        }

        return { entries, ending, chosenOutcome };
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

    return { entries, ending, chosenOutcome };
  }
}
