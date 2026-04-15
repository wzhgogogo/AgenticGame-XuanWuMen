import type {
  WorldState,
  PressureModifier,
  NpcAction,
  PendingEvent,
  WorldTickResult,
  GameMode,
  EventInstance,
  NpcActionType,
  NpcAgentState,
  DailyActivity,
} from '../../types/world';
import type { Character, ISceneManager, SceneConfig } from '../../types';
import type { LLMProvider } from '../llm/types';
import { tickPressure, applyPressureModifiers, checkEventTriggers, snapshotPressure } from './pressure';
import { advanceDay, formatDate } from './calendar';
import { tickNpcAgent, filterPlausibleActions, recordNpcAction } from './npcAgent';
import { NPC_DECISION_RULES, NPC_PATIENCE_DECAY } from '../../data/agents/npcDecisionRules';
import { OFFSTAGE_AGENTS } from '../../data/agents/offstageAgents';
import { ALL_SKELETONS } from '../../data/skeletons';
import { resolveEventInstance } from './eventGenerator';
import { eventInstanceToSceneConfig, buildResolutionPromptSection } from './eventRunner';
import { applyActivityEffects, getFlavorText } from './activities';
import { buildNpcDecisionPrompt } from './npcPromptBuilder';
import { createInitialWorldState, saveWorldState, loadWorldState, clearSavedWorldState } from './worldState';
import { extractJson } from '../jsonExtractor';

type WorldListener = (state: WorldState, mode: GameMode) => void;

export class WorldSimulator {
  private state: WorldState;
  private mode: GameMode = 'title_screen';
  private listeners: Set<WorldListener> = new Set();

  private llmProvider: LLMProvider;
  private characters: Character[];
  private player: Character;

  private currentEventInstance: EventInstance | null = null;
  private currentSceneManager: ISceneManager | null = null;
  private backgroundTickPromise: Promise<WorldTickResult> | null = null;
  private latestTickResult: WorldTickResult | null = null;

  /** tick 启动时的 pressureAxes 快照，用于计算 tick 增量 */
  private tickBaselinePressure: WorldState['pressureAxes'] | null = null;
  /** tick 启动时每个 NPC 的 patience 快照，用于计算 tick 对 patience 的增量 */
  private tickBaselinePatience: Record<string, number> | null = null;

  constructor(
    llmProvider: LLMProvider,
    characters: Character[],
    player: Character,
  ) {
    this.llmProvider = llmProvider;
    this.characters = characters;
    this.player = player;
    this.state = createInitialWorldState();
  }

  // --- 公共 API ---

  getState(): WorldState { return this.state; }
  getMode(): GameMode { return this.mode; }
  getPlayer(): Character { return this.player; }
  getCurrentEventInstance(): EventInstance | null { return this.currentEventInstance; }
  getCurrentSceneManager(): ISceneManager | null { return this.currentSceneManager; }
  getLatestTickResult(): WorldTickResult | null { return this.latestTickResult; }

  subscribe(listener: WorldListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  // --- 游戏流程 ---

  startGame(): void {
    this.state = createInitialWorldState();
    this.setMode('daily_activities');
    this.notify();
  }

  /**
   * 从存档恢复游戏
   * 返回 true 如果成功恢复
   */
  restoreGame(): boolean {
    const saved = loadWorldState();
    if (!saved) return false;
    this.state = saved;
    this.setMode('daily_activities');
    this.notify();
    return true;
  }

  /**
   * 清除存档
   */
  clearSave(): void {
    clearSavedWorldState();
  }

  /**
   * 玩家选择了一个日常活动
   * 立即应用效果，同时在后台开始世界 tick
   */
  applyActivity(activity: DailyActivity): string {
    const { state, pressureChanges } = applyActivityEffects(this.state, activity);
    this.state = {
      ...state,
      pressureAxes: applyPressureModifiers(state.pressureAxes, pressureChanges),
    };
    this.notify();

    // 第一个活动时启动后台 tick
    if (!this.backgroundTickPromise) {
      this.backgroundTickPromise = this.runWorldTick();
    }

    return getFlavorText(activity);
  }

  /**
   * 玩家结束今日，推进到日报
   */
  async endDay(): Promise<WorldTickResult> {
    // 等待后台 tick 完成
    if (this.backgroundTickPromise) {
      this.latestTickResult = await this.backgroundTickPromise;
      this.backgroundTickPromise = null;
    } else {
      this.latestTickResult = await this.runWorldTick();
    }

    // 日历不在这里推进——等玩家从日报继续时再推进，
    // 这样日报显示的日期和 tick 内生成的日报文本一致（都是"今天"）

    this.setMode('daily_briefing');

    this.notify();
    return this.latestTickResult;
  }

  /**
   * 从日报进入下一步
   */
  async proceedFromBriefing(): Promise<void> {
    // 日报结束，推进日历到明天
    this.state = { ...this.state, calendar: advanceDay(this.state.calendar) };

    if (this.state.pendingEvents.length > 0) {
      // 有事件需要处理
      await this.enterEvent(this.state.pendingEvents[0]);
    } else {
      // 没有事件，继续日常
      this.setMode('daily_activities');
      this.notify();
    }
  }

  /**
   * 进入事件场景
   */
  async enterEvent(pending: PendingEvent): Promise<void> {
    const skeleton = ALL_SKELETONS.find((s) => s.id === pending.skeletonId);
    if (!skeleton) {
      // 移除无效 pending
      this.state = {
        ...this.state,
        pendingEvents: this.state.pendingEvents.filter((pe) => pe !== pending),
      };
      this.setMode('daily_activities');
      this.notify();
      return;
    }

    const npcIds = this.characters
      .filter((c) => c.role !== 'player_character')
      .map((c) => c.id);

    // 生成事件实例
    const instance = await resolveEventInstance(
      pending,
      skeleton,
      this.state,
      npcIds,
      this.llmProvider,
    );

    this.currentEventInstance = instance;

    // 移除已处理的 pending
    this.state = {
      ...this.state,
      pendingEvents: this.state.pendingEvents.filter((pe) => pe !== pending),
    };

    this.setMode('event_scene');
    this.notify();
  }

  /**
   * 事件场景结束后的处理
   */
  handleEventEnd(summary: string): void {
    if (!this.currentEventInstance) return;

    // 记录事件
    this.state = {
      ...this.state,
      eventLog: [
        ...this.state.eventLog,
        {
          instanceId: `${this.currentEventInstance.skeletonId}_${this.state.calendar.daysSinceStart}`,
          skeletonId: this.currentEventInstance.skeletonId,
          name: this.currentEventInstance.name,
          day: this.state.calendar.daysSinceStart,
          summary,
          pressureEffects: this.currentEventInstance.outcomeEffects,
        },
      ],
      // 应用事件后效果
      pressureAxes: applyPressureModifiers(
        this.state.pressureAxes,
        this.currentEventInstance.outcomeEffects,
      ),
    };

    this.currentEventInstance = null;
    this.currentSceneManager = null;

    // 检查游戏结束条件
    if (this.checkGameOver()) {
      this.setMode('game_over');
    } else {
      this.setMode('daily_activities');
    }

    this.notify();
  }

  /**
   * 为事件场景创建 SceneConfig（供 App.tsx 创建 SceneManager）
   */
  getEventSceneConfig(): SceneConfig | null {
    if (!this.currentEventInstance) return null;
    return eventInstanceToSceneConfig(this.currentEventInstance, this.state.calendar);
  }

  /**
   * 获取收束 prompt 部分（注入到 SceneManager 的 system prompt）
   */
  getResolutionPrompt(): string {
    if (!this.currentEventInstance) return '';
    return buildResolutionPromptSection(this.currentEventInstance);
  }

  // --- 内部：世界 tick ---

  private async runWorldTick(): Promise<WorldTickResult> {
    // 深拷贝可变嵌套对象，避免和 applyActivity 共享引用
    let tickState: WorldState = {
      ...this.state,
      pressureAxes: Object.fromEntries(
        Object.entries(this.state.pressureAxes).map(([k, v]) => [k, { ...v }]),
      ) as WorldState['pressureAxes'],
      npcAgents: Object.fromEntries(
        Object.entries(this.state.npcAgents).map(([k, v]) => [k, { ...v, recentActions: [...v.recentActions] }]),
      ) as WorldState['npcAgents'],
      pendingEvents: [...this.state.pendingEvents],
      eventLog: [...this.state.eventLog],
      globalFlags: { ...this.state.globalFlags },
      factions: Object.fromEntries(
        Object.entries(this.state.factions).map(([k, v]) => [k, { ...v }]),
      ) as WorldState['factions'],
    };
    // 保存 tick 启动时的 pressureAxes 基线，用于计算 tick 增量
    this.tickBaselinePressure = Object.fromEntries(
      Object.entries(tickState.pressureAxes).map(([k, v]) => [k, { ...v }]),
    ) as WorldState['pressureAxes'];
    // 保存 tick 启动时每个 NPC 的 patience，用于计算 tick 对 patience 的增量（衰减等）
    this.tickBaselinePatience = Object.fromEntries(
      Object.entries(tickState.npcAgents).map(([k, v]) => [k, v.patience]),
    );
    const allPressureChanges: PressureModifier[] = [];
    const allNpcActions: NpcAction[] = [];

    // 1. 幕后 Agent 每日效果（确定性）
    for (const agent of OFFSTAGE_AGENTS) {
      const effects = agent.dailyPressureEffects(tickState);
      allPressureChanges.push(...effects);
    }

    // 2. NPC Agent 决策
    for (const charId of Object.keys(tickState.npcAgents)) {
      const agentState = tickState.npcAgents[charId];
      const rules = NPC_DECISION_RULES[charId];
      const character = this.characters.find((c) => c.id === charId);
      if (!rules || !character) continue;

      // 每日耐心衰减
      const decayRate = NPC_PATIENCE_DECAY[charId] ?? 1;
      const tickedAgent = tickNpcAgent(agentState, decayRate);
      tickState = {
        ...tickState,
        npcAgents: { ...tickState.npcAgents, [charId]: tickedAgent },
      };

      // 确定性过滤
      const { enabledActions, autoEffects, triggerEvent } = filterPlausibleActions(
        tickedAgent, rules, tickState, character,
      );
      allPressureChanges.push(...autoEffects);

      // 如果有非 wait 行动且不只是 wait，调 LLM
      const nonWaitActions = enabledActions.filter((a) => a !== 'wait');
      if (nonWaitActions.length > 0) {
        try {
          const action = await this.runNpcLlmDecision(charId, character.name, tickedAgent, enabledActions);
          if (action) {
            allNpcActions.push(action);
            allPressureChanges.push(...action.pressureEffects);

            tickState = {
              ...tickState,
              npcAgents: {
                ...tickState.npcAgents,
                [charId]: recordNpcAction(tickState.npcAgents[charId], action),
              },
            };
          }
        } catch {
          // LLM 调用失败，静默处理
        }
      }

      // 如果规则触发了事件
      if (triggerEvent) {
        const alreadyPending = tickState.pendingEvents.some((pe) => pe.skeletonId === triggerEvent);
        if (!alreadyPending) {
          tickState = {
            ...tickState,
            pendingEvents: [
              ...tickState.pendingEvents,
              {
                skeletonId: triggerEvent,
                triggeredOnDay: tickState.calendar.daysSinceStart,
                pressureSnapshot: snapshotPressure(tickState.pressureAxes),
              },
            ],
          };
        }
      }
    }

    // 3. 应用所有压力变化
    tickState = {
      ...tickState,
      pressureAxes: applyPressureModifiers(tickState.pressureAxes, allPressureChanges),
    };

    // 4. 每日压力自然 tick
    tickState = {
      ...tickState,
      pressureAxes: tickPressure(tickState.pressureAxes),
    };

    // 5. 检查骨架事件触发
    const triggered = checkEventTriggers(tickState, ALL_SKELETONS);
    if (triggered.length > 0) {
      tickState = {
        ...tickState,
        pendingEvents: [...tickState.pendingEvents, ...triggered],
      };
    }

    // 6. 生成日报
    const dailyBriefing = this.buildDailyBriefing(allNpcActions, triggered);

    // 一次性写回：合并 tick 结果和玩家活动期间的变化
    // 策略：tick 的 npcAgents 以 tick 结果为基础，但 merge 活动期间对 patience 的修改
    //        pressureAxes 以当前 live state 为基础，叠加 tick 产生的增量（而非直接覆盖）
    //        pendingEvents 和 eventLog 以 tick 结果为准（活动不改这些）

    // 计算 tick 对 pressureAxes 的增量，叠加到 live state
    const mergedPressureAxes = { ...this.state.pressureAxes };
    if (this.tickBaselinePressure) {
      for (const axisId of Object.keys(tickState.pressureAxes)) {
        const baseline = this.tickBaselinePressure[axisId as keyof typeof this.tickBaselinePressure];
        const tickFinal = tickState.pressureAxes[axisId as keyof typeof tickState.pressureAxes];
        const live = mergedPressureAxes[axisId as keyof typeof mergedPressureAxes];
        if (baseline && tickFinal && live) {
          const tickDelta = tickFinal.value - baseline.value;
          live.value = Math.max(live.floor, Math.min(live.ceiling, live.value + tickDelta));
        }
      }
    }

    // 合并 npcAgents：tick 的 recentActions/plan 以 tick 为准，
    // patience = livePatience + tick增量（衰减等），保留活动修改且不丢失衰减
    const mergedNpcAgents = { ...tickState.npcAgents };
    for (const charId of Object.keys(mergedNpcAgents)) {
      const liveAgent = this.state.npcAgents[charId];
      if (liveAgent) {
        const baselinePatience = this.tickBaselinePatience?.[charId] ?? liveAgent.patience;
        const tickPatience = tickState.npcAgents[charId].patience;
        const tickDelta = tickPatience - baselinePatience; // 衰减通常为负
        const mergedPatience = Math.max(0, Math.min(100, liveAgent.patience + tickDelta));
        mergedNpcAgents[charId] = {
          ...tickState.npcAgents[charId],
          patience: mergedPatience,
        };
      }
    }

    this.state = {
      ...this.state,
      npcAgents: mergedNpcAgents,
      pendingEvents: tickState.pendingEvents,
      pressureAxes: mergedPressureAxes,
    };
    this.tickBaselinePressure = null;
    this.tickBaselinePatience = null;

    return {
      pressureChanges: allPressureChanges,
      npcActions: allNpcActions,
      triggeredEvents: triggered,
      dailyBriefing,
    };
  }

  private async runNpcLlmDecision(
    charId: string,
    charName: string,
    agentState: NpcAgentState,
    enabledActions: NpcActionType[],
  ): Promise<NpcAction | null> {
    const prompt = buildNpcDecisionPrompt(charId, charName, agentState, enabledActions, this.state);

    let fullResponse = '';
    const result = await this.llmProvider.chat(
      [
        { role: 'system', content: `你是${charName}，秦王府的核心成员。请按要求输出JSON。` },
        { role: 'user', content: prompt },
      ],
      (chunk: string) => { fullResponse += chunk; },
    );
    if (!fullResponse) {
      fullResponse = result.content;
    }

    try {
      const jsonStr = extractJson(fullResponse);
      if (!jsonStr) return null;

      const parsed = JSON.parse(jsonStr);
      if (!parsed.action) return null;

      return {
        characterId: charId,
        actionType: parsed.action as NpcActionType,
        description: parsed.reason || '',
        pressureEffects: [], // 基础效果已在 autoEffects 里
        narrativeHook: parsed.narrativeHook || '',
      };
    } catch {
      return null;
    }
  }

  private buildDailyBriefing(npcActions: NpcAction[], triggeredEvents: PendingEvent[]): string {
    const lines: string[] = [];
    lines.push(`【${formatDate(this.state.calendar)}】`);
    lines.push('');

    if (npcActions.length > 0) {
      for (const action of npcActions) {
        if (action.narrativeHook) {
          lines.push(`· ${action.narrativeHook}`);
        }
      }
      lines.push('');
    }

    if (triggeredEvents.length > 0) {
      lines.push('有紧急事态需要处理——');
      for (const event of triggeredEvents) {
        const skeleton = ALL_SKELETONS.find((s) => s.id === event.skeletonId);
        if (skeleton) {
          lines.push(`· ${skeleton.category}：${skeleton.description.slice(0, 30)}...`);
        }
      }
    } else {
      lines.push('今日暂无大事。');
    }

    return lines.join('\n');
  }

  // --- 游戏结束检查 ---

  private checkGameOver(): boolean {
    // 条件1：军事冲突事件已完成（最终决战）
    if (this.state.eventLog.some((e) => e.skeletonId === 'skeleton_military_conflict')) {
      return true;
    }

    // 条件2：时间超过八月（历史极限）
    if (this.state.calendar.month > 8) {
      return true;
    }

    return false;
  }

  // --- 状态管理 ---

  private setMode(mode: GameMode): void {
    this.mode = mode;
  }

  private notify(): void {
    // 自动存档（事件场景中不存，避免存到中间状态）
    if (this.mode !== 'event_scene') {
      saveWorldState(this.state);
    }
    for (const fn of this.listeners) {
      fn(this.state, this.mode);
    }
  }
}
