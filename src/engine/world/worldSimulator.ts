import type {
  WorldState,
  PressureModifier,
  NpcAction,
  PendingEvent,
  WorldTickResult,
  GameMode,
  EndingType,
  EventInstance,
  NpcStance,
  NpcAgentState,
  DailyActivity,
  PressureAxisId,
} from '../../types/world';
import type { Character, ISceneManager, SceneConfig, MemoryEntry } from '../../types';
import type { LLMProvider } from '../llm/types';
import { tickPressure, applyPressureModifiers, applyOutcomeEffects, extractPressureModifiers, checkEventTriggers, snapshotPressure } from './pressure';
import { advanceDay, formatDate, isAfterDate } from './calendar';
import { tickNpcAgent, filterPlausibleActions, recordNpcAction, consumeOnceRule } from './npcAgent';
import { NPC_DECISION_RULES, NPC_PATIENCE_DECAY, NPC_IMPACT_PROFILES } from '../../data/agents/npcDecisionRules';
import { OFFSTAGE_AGENTS } from '../../data/agents/offstageAgents';
import { ALL_SKELETONS } from '../../data/skeletons';
import { resolveEventInstance } from './eventGenerator';
import { eventInstanceToSceneConfig, buildResolutionPromptSection } from './eventRunner';
import { applyActivityEffects, getFlavorText } from './activities';
import { buildNpcDecisionPrompt } from './npcPromptBuilder';
import { createInitialWorldState, saveWorldState, loadWorldState, clearSavedWorldState, appendPlayerAction } from './worldState';
import { extractJson } from '../jsonExtractor';
import { extractSceneMemories, summarizeOldMemories } from './memoryExtractor';
import { resolveEnding, type EndingDecision } from './endingResolver';
import { planFastForward } from './fastForward';
import { debugLog } from '../debugLog';

export function detectNarrativeEnding(summary: string): EndingType | null {
  const deathPatterns = /被.*?(?:斩首|处死|赐死|处斩|杀害|毒杀|缢死|诛杀)/;
  const capturePatterns = /(?:秦王|李世民|世民).*?(?:幽禁|囚禁|被囚|入狱|下狱|被捕|被擒|就擒|被俘)/;
  const exilePatterns = /(?:秦王|李世民|世民).*?(?:流放|贬谪|削爵|废为庶人|逐出长安)/;
  const loseAllPatterns = /(?:剥夺.*兵权|满门抄斩|灭门|族灭|身死族灭)/;

  if (deathPatterns.test(summary) || loseAllPatterns.test(summary)) {
    return 'coup_fail_captured';
  }
  if (capturePatterns.test(summary) || exilePatterns.test(summary)) {
    return 'deposed';
  }
  return null;
}

type WorldListener = (state: WorldState, mode: GameMode) => void;

export class WorldSimulator {
  private state: WorldState;
  private mode: GameMode = 'title_screen';
  private endingType: EndingType | null = null;
  private endingDecision: EndingDecision | null = null;
  private listeners: Set<WorldListener> = new Set();

  private llmProvider: LLMProvider;
  private characters: Character[];
  private player: Character;

  private currentEventInstance: EventInstance | null = null;
  private currentSceneManager: ISceneManager | null = null;
  private backgroundTickPromise: Promise<WorldTickResult> | null = null;
  private latestTickResult: WorldTickResult | null = null;
  /** briefing 期间后台预取的事件变体 Promise */
  private backgroundEventPromise: Promise<EventInstance> | null = null;
  /** 预取的是哪个 skeleton，用于匹配确认 */
  private backgroundEventSkeletonId: string | null = null;

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
  getEndingType(): EndingType | null { return this.endingType; }
  getEndingDecision(): EndingDecision | null { return this.endingDecision; }
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
    if (!saved.characterMemories) saved.characterMemories = {};
    if (!saved.characterLongTermSummary) saved.characterLongTermSummary = {};
    if (!saved.relationshipOverrides) saved.relationshipOverrides = {};
    if (!saved.playerActionLog) saved.playerActionLog = [];
    this.state = saved;
    this.syncMemoriesToCharacters();
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
      playerActionLog: appendPlayerAction(state.playerActionLog, {
        day: state.calendar.daysSinceStart,
        date: formatDate(state.calendar),
        type: 'activity',
        id: activity.id,
        name: activity.name,
        category: activity.category,
      }),
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

    // 检查游戏结束（时间到或压力爆表）
    const ending = this.checkGameOver();
    if (ending) {
      this.endingType = ending;
      this.setMode('game_over');
    } else {
      this.setMode('daily_briefing');

      // 如果 tick 产生了 pendingEvent，briefing 期间后台先生成事件变体，
      // 避免玩家从 briefing → event_scene 之间再等一次 LLM。
      this.startEventPrefetchIfPending();
    }

    this.notify();
    return this.latestTickResult;
  }

  /**
   * 若当前存在 pendingEvents[0]，在后台启动事件变体生成。
   * 幂等：已有预取在跑则不重复启动；skeleton 变化则丢弃旧的。
   */
  private startEventPrefetchIfPending(): void {
    const pending = this.state.pendingEvents[0];
    if (!pending) return;
    if (this.backgroundEventPromise && this.backgroundEventSkeletonId === pending.skeletonId) {
      return; // 已在跑，且匹配
    }
    const skeleton = ALL_SKELETONS.find((s) => s.id === pending.skeletonId);
    if (!skeleton) return;

    const npcIds = this.characters
      .filter((c) => c.role !== 'player_character')
      .filter((c) => {
        const agent = this.state.npcAgents[c.id];
        return !agent || !agent.status || agent.status === 'active';
      })
      .map((c) => c.id);

    debugLog('event_trigger', `后台预取事件变体: ${pending.skeletonId}`);
    this.backgroundEventSkeletonId = pending.skeletonId;
    this.backgroundEventPromise = resolveEventInstance(
      pending,
      skeleton,
      this.state,
      npcIds,
      this.llmProvider,
    ).catch((err) => {
      // 预取失败也不抛错，让 enterEvent 自己再试一次
      debugLog('event_trigger', `事件变体预取失败`, String(err));
      this.backgroundEventPromise = null;
      this.backgroundEventSkeletonId = null;
      throw err;
    });
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
   * 快进 N 天：循环跑 endDay + proceedFromBriefing。
   * 任一停止信号（事件触发 / mode 切换为 event_scene / game_over）立刻退出。
   * 返回实际推进的天数。
   */
  async fastForward(maxDays: number): Promise<{ daysAdvanced: number; stopReason: string }> {
    if (this.getMode() !== 'daily_activities') {
      return { daysAdvanced: 0, stopReason: '当前不在日常活动状态' };
    }

    let daysAdvanced = 0;
    for (let i = 0; i < maxDays; i++) {
      const plan = planFastForward(this.state, 1);
      if (!plan.canForward) {
        return { daysAdvanced, stopReason: plan.stopReasons.join('；') || '无法继续快进' };
      }

      await this.endDay();
      if (this.getMode() === 'game_over') {
        return { daysAdvanced, stopReason: '游戏结束' };
      }

      await this.proceedFromBriefing();
      daysAdvanced++;

      const m = this.getMode();
      if (m === 'event_scene') {
        return { daysAdvanced, stopReason: '触发事件，已进入场景' };
      }
      if (m === 'game_over') {
        return { daysAdvanced, stopReason: '游戏结束' };
      }
    }

    return { daysAdvanced, stopReason: '已快进完成' };
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
      .filter((c) => {
        const agent = this.state.npcAgents[c.id];
        return !agent || !agent.status || agent.status === 'active';
      })
      .map((c) => c.id);

    // 若 briefing 期间已在后台预取并匹配，直接 await；否则同步生成
    let instance: EventInstance;
    if (
      this.backgroundEventPromise &&
      this.backgroundEventSkeletonId === pending.skeletonId
    ) {
      try {
        instance = await this.backgroundEventPromise;
      } catch {
        // 预取失败则 fallback 同步生成
        instance = await resolveEventInstance(pending, skeleton, this.state, npcIds, this.llmProvider);
      }
    } else {
      instance = await resolveEventInstance(pending, skeleton, this.state, npcIds, this.llmProvider);
    }
    this.backgroundEventPromise = null;
    this.backgroundEventSkeletonId = null;

    this.currentEventInstance = instance;

    debugLog('event_trigger', `进入事件: ${instance.name}`, `骨架: ${pending.skeletonId}\n地点: ${instance.location}\nNPC: ${instance.activeNpcIds.join(', ')}`);

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
   * @param chosenOutcome  LLM 在结局中选择的 ResolutionTag。未提供则按 'success' 兜底。
   */
  handleEventEnd(summary: string, chosenOutcome: 'success' | 'partial' | 'failure' | 'disaster' = 'success'): Promise<void> {
    if (!this.currentEventInstance) return Promise.resolve();

    const npcIds = [...this.currentEventInstance.activeNpcIds];
    const sceneId = this.currentEventInstance.skeletonId;
    const dateStr = formatDate(this.state.calendar);

    // 按 chosenOutcome 过滤候选 outcome 池
    const effectiveOutcomes = this.currentEventInstance.outcomeEffects.filter(
      (e) => e.tag === chosenOutcome,
    );
    const pressureModifiers = extractPressureModifiers(effectiveOutcomes);

    // 记录事件（pressureEffects 字段保留 PressureModifier[] 兼容旧调试/eval）
    let nextState: WorldState = {
      ...this.state,
      eventLog: [
        ...this.state.eventLog,
        {
          instanceId: `${this.currentEventInstance.skeletonId}_${this.state.calendar.daysSinceStart}`,
          skeletonId: this.currentEventInstance.skeletonId,
          name: this.currentEventInstance.name,
          day: this.state.calendar.daysSinceStart,
          summary,
          pressureEffects: pressureModifiers,
        },
      ],
      playerActionLog: appendPlayerAction(this.state.playerActionLog, {
        day: this.state.calendar.daysSinceStart,
        date: dateStr,
        type: 'event_resolved',
        id: this.currentEventInstance.skeletonId,
        name: this.currentEventInstance.name,
        summary: summary.length > 60 ? summary.slice(0, 60) + '…' : summary,
      }),
    };

    // 应用 outcome 走单一入口（v3.4.4）
    nextState = applyOutcomeEffects(nextState, effectiveOutcomes);
    this.state = nextState;

    // 事件反馈 NPC 状态：参与事件的 NPC 耐心下降（紧迫感），未参与的不受影响
    const updatedAgents = { ...this.state.npcAgents };
    for (const npcId of npcIds) {
      const agent = updatedAgents[npcId];
      if (!agent) continue;
      updatedAgents[npcId] = {
        ...agent,
        patience: Math.max(0, agent.patience - 5),
        alertness: Math.min(100, agent.alertness + 10),
        daysSinceLastAction: 0,
      };
    }
    this.state = { ...this.state, npcAgents: updatedAgents };

    this.currentEventInstance = null;
    this.currentSceneManager = null;

    // 提取角色记忆（返回 Promise 以便调用方可选择等待）
    const memoryPromise = this.extractAndStoreMemories(summary, npcIds, sceneId, dateStr);

    // 检查事件结局文本是否包含终结性叙事（秦王被杀/被囚等）
    const narrativeEnding = this.detectNarrativeEnding(summary);
    const mechanicalEnding = this.checkGameOver();
    const ending = narrativeEnding ?? mechanicalEnding;

    if (ending) {
      this.endingType = ending;
      this.setMode('game_over');
    } else {
      this.setMode('daily_activities');
    }

    this.notify();
    return memoryPromise;
  }

  private detectNarrativeEnding(summary: string): EndingType | null {
    return detectNarrativeEnding(summary);
  }

  private async extractAndStoreMemories(
    summary: string, npcIds: string[], sceneId: string, dateStr: string,
  ): Promise<void> {
    try {
      const extraction = await extractSceneMemories(
        this.llmProvider, summary, npcIds, this.characters, sceneId, dateStr,
      );
      const newMemories = extraction.memories;
      const merged = { ...this.state.characterMemories };
      const summaryMap = { ...(this.state.characterLongTermSummary || {}) };

      // 每角色独立处理：合并 → 检查上限 → 必要时摘要旧记忆
      for (const [charId, entries] of Object.entries(newMemories)) {
        const existing = merged[charId] || [];
        const combined = [...existing, ...entries];
        merged[charId] = await this.compactMemoriesForCharacter(
          charId, combined, summaryMap,
        );
      }

      // 关系 delta 合并到 relationshipOverrides
      const overrides = this.mergeRelationshipDeltas(
        this.state.relationshipOverrides || {},
        extraction.relationshipDeltas,
      );

      debugLog('memory', `记忆提取完成`, JSON.stringify(extraction, null, 2));
      this.state = {
        ...this.state,
        characterMemories: merged,
        characterLongTermSummary: summaryMap,
        relationshipOverrides: overrides,
      };
      this.syncMemoriesToCharacters();
      saveWorldState(this.state);
      this.notify();
    } catch {
      // best-effort
    }
  }

  /** 把一批 relationshipDeltas 合并进 overrides 映射；同方向累加，recentEvents 保留最新 5 条 */
  private mergeRelationshipDeltas(
    existing: Record<string, Record<string, { trustDelta: number; recentEvents: string[] }>>,
    deltas: { from: string; to: string; trustDelta: number; reason: string }[],
  ): Record<string, Record<string, { trustDelta: number; recentEvents: string[] }>> {
    if (deltas.length === 0) return existing;
    const next = { ...existing };
    for (const d of deltas) {
      if (!next[d.from]) next[d.from] = { ...(existing[d.from] || {}) };
      const prev = next[d.from][d.to] || { trustDelta: 0, recentEvents: [] };
      const newEvents = d.reason
        ? [...prev.recentEvents, d.reason].slice(-5)
        : prev.recentEvents;
      next[d.from][d.to] = {
        // clamp 累计在 -60..+60 之间，防止无限漂移
        trustDelta: Math.max(-60, Math.min(60, prev.trustDelta + d.trustDelta)),
        recentEvents: newEvents,
      };
    }
    return next;
  }

  /**
   * 压缩单个角色的记忆数组：未超上限直接返回；超上限时 LLM 摘要被淘汰的那批，
   * 写入 summaryMap，保留高重要度 + 最新共 MEMORY_SOFT_CAP 条。
   */
  private async compactMemoriesForCharacter(
    charId: string,
    combined: MemoryEntry[],
    summaryMap: Record<string, string>,
  ): Promise<MemoryEntry[]> {
    const SOFT_CAP = 10;
    const SUMMARIZE_THRESHOLD = 15;

    if (combined.length <= SOFT_CAP) {
      return combined;
    }

    // 10 < length <= 15：按 importance + 最新保底截到 SOFT_CAP，被淘汰的暂不摘要（避免频繁 LLM）
    if (combined.length < SUMMARIZE_THRESHOLD) {
      return this.rankAndKeepTop(combined, SOFT_CAP);
    }

    // length >= SUMMARIZE_THRESHOLD：被淘汰的那批送去 LLM 摘要
    const kept = this.rankAndKeepTop(combined, SOFT_CAP);
    const keptIds = new Set(kept.map((m) => m.id));
    const dropped = combined.filter((m) => !keptIds.has(m.id));

    if (dropped.length > 0) {
      const charName = this.characters.find((c) => c.id === charId)?.name || charId;
      const existingSummary = summaryMap[charId] || '';
      const updatedSummary = await summarizeOldMemories(
        this.llmProvider, charName, dropped, existingSummary,
      );
      summaryMap[charId] = updatedSummary;
      debugLog('memory', `长期记忆摘要更新：${charName}`, updatedSummary);
    }

    return kept;
  }

  /** 从记忆数组中保留 top N：最新 2 条保底 + 剩余按 importance 降序 */
  private rankAndKeepTop(memories: MemoryEntry[], n: number): MemoryEntry[] {
    if (memories.length <= n) return memories;
    const recentGuaranteed = Math.min(2, n);
    const recent = memories.slice(-recentGuaranteed);
    const recentIds = new Set(recent.map((m) => m.id));
    const rest = memories
      .filter((m) => !recentIds.has(m.id))
      .sort((a, b) => (b.importance - a.importance) || b.date.localeCompare(a.date));
    const picked = [...recent, ...rest.slice(0, n - recent.length)];
    return picked.sort((a, b) => a.date.localeCompare(b.date));
  }

  private syncMemoriesToCharacters(): void {
    for (const char of this.characters) {
      char.shortTermMemory = this.state.characterMemories[char.id] || [];
      char.longTermSummary = this.state.characterLongTermSummary?.[char.id];
    }
  }

  /**
   * 为事件场景创建 SceneConfig（供 App.tsx 创建 SceneManager）
   */
  getEventSceneConfig(): SceneConfig | null {
    if (!this.currentEventInstance) return null;
    return eventInstanceToSceneConfig(this.currentEventInstance, this.state.calendar, this.state.pressureAxes);
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

    // 1b. 时间窗 flag 触发器（确定性历史背景事件）
    // 突厥犯边：约三月中旬之后种入，触发一次后不再重复
    if (
      !tickState.globalFlags['tujue_invasion'] &&
      isAfterDate(tickState.calendar, 3, 15)
    ) {
      tickState = {
        ...tickState,
        globalFlags: { ...tickState.globalFlags, tujue_invasion: true },
      };
      debugLog('event_trigger', '时间窗 flag 触发: tujue_invasion');
    }

    // 2. NPC Agent 决策（确定性阶段 + 并行 LLM 调用）

    // 2a. 确定性阶段：耐心衰减 + 规则过滤（串行，无 LLM）
    interface NpcTickTask {
      charId: string;
      character: Character;
      tickedAgent: NpcAgentState;
      allowedStances: NpcStance[];
      escalationHints: string[];
      onceRuleIds: string[];
      triggerEvent?: string;
    }
    const npcTasks: NpcTickTask[] = [];

    for (const charId of Object.keys(tickState.npcAgents)) {
      const agentState = tickState.npcAgents[charId];
      const rules = NPC_DECISION_RULES[charId];
      const character = this.characters.find((c) => c.id === charId);
      if (!rules || !character) continue;
      // v3.4.4：非 active 的 NPC（流放/下狱/死亡/远征）跳过决策
      if (agentState.status && agentState.status !== 'active') continue;

      const decayRate = NPC_PATIENCE_DECAY[charId] ?? 1;
      const tickedAgent = tickNpcAgent(agentState, decayRate);
      tickState = {
        ...tickState,
        npcAgents: { ...tickState.npcAgents, [charId]: tickedAgent },
      };

      const { allowedStances, escalationHints, triggerEvent, onceRuleIds } = filterPlausibleActions(
        tickedAgent, rules, tickState, character,
      );

      const hasNonObserve = allowedStances.some((s) => s !== 'observe');
      if (hasNonObserve || allowedStances.length > 1) {
        npcTasks.push({ charId, character, tickedAgent, allowedStances, escalationHints, onceRuleIds, triggerEvent });
      } else if (triggerEvent) {
        npcTasks.push({ charId, character, tickedAgent, allowedStances: [], escalationHints, onceRuleIds, triggerEvent });
      }
    }

    // 2b. 并行 LLM 调用
    const llmResults = await Promise.all(
      npcTasks
        .filter((t) => t.allowedStances.length > 0)
        .map(async (t) => {
          try {
            return await this.runNpcLlmDecision(t.charId, t.character.name, t.tickedAgent, t.allowedStances, t.escalationHints, t.character);
          } catch {
            return null;
          }
        }),
    );

    // 2c. 合并结果
    let llmIdx = 0;
    for (const task of npcTasks) {
      if (task.allowedStances.length > 0) {
        const action = llmResults[llmIdx++];
        if (action) {
          allNpcActions.push(action);
          allPressureChanges.push(...action.pressureEffects);

          // 消耗 once 规则：如果 NPC 选的 stance 属于 breakdown/abandon，消耗对应规则
          let nextAgent = recordNpcAction(tickState.npcAgents[task.charId], action);
          if (action.stance === 'breakdown' || action.stance === 'abandon') {
            for (const ruleId of task.onceRuleIds) {
              nextAgent = consumeOnceRule(nextAgent, ruleId);
            }
            debugLog('npc_decision', `${task.character.name} 触发 ${action.stance}`, `消耗规则: ${task.onceRuleIds.join(',')}`);
          }

          tickState = {
            ...tickState,
            npcAgents: { ...tickState.npcAgents, [task.charId]: nextAgent },
          };
        }
      }

      if (task.triggerEvent) {
        const alreadyPending = tickState.pendingEvents.some((pe) => pe.skeletonId === task.triggerEvent);
        if (!alreadyPending) {
          tickState = {
            ...tickState,
            pendingEvents: [
              ...tickState.pendingEvents,
              {
                skeletonId: task.triggerEvent!,
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
      for (const t of triggered) {
        debugLog('event_trigger', `骨架触发: ${t.skeletonId}`, JSON.stringify(t.pressureSnapshot, null, 2));
      }
      tickState = {
        ...tickState,
        pendingEvents: [...tickState.pendingEvents, ...triggered],
      };
    }

    // 6. 生成日报
    const dailyBriefing = this.buildDailyBriefing(triggered);

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
    allowedStances: NpcStance[],
    escalationHints: string[],
    character?: Character,
  ): Promise<NpcAction | null> {
    const impactProfile = NPC_IMPACT_PROFILES[charId];
    const prompt = buildNpcDecisionPrompt(charId, charName, agentState, allowedStances, this.state, {
      escalationHints,
      impactWhitelist: impactProfile?.whitelist,
      character,
    });

    debugLog('llm_call', `NPC决策: ${charName}`, `可选立场: ${allowedStances.join(', ')}\n\nPrompt:\n${prompt}`);

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
      if (!jsonStr) return this.fallbackObserve(charId, allowedStances);

      const parsed = JSON.parse(jsonStr);
      if (!parsed.stance && !parsed.action) return this.fallbackObserve(charId, allowedStances);

      const normalized = this.normalizeIntent(parsed, charId, charName, allowedStances, impactProfile?.whitelist);
      debugLog('npc_decision', `${charName} → ${normalized.stance}: ${normalized.action}`,
        `degrade=${normalized.degradeLevel ?? 0}; deltas=${normalized.pressureEffects.map(e => `${e.axisId}${e.delta >= 0 ? '+' : ''}${e.delta}`).join(',')}`);
      return normalized;
    } catch {
      return this.fallbackObserve(charId, allowedStances);
    }
  }

  /**
   * 校验并规范化 LLM 输出的 intent。执行三级降级：
   * - Level 1 矫正：超 cap → 缩放；白名单外 → 丢条；空字段 → 兜底
   * - Level 2 stance 降级：stance 不在允许清单 → 降为 allowedStances[0]，deltas 清零
   * - Level 3 回退：由 fallbackObserve 处理（JSON 异常路径）
   */
  private normalizeIntent(
    parsed: Record<string, unknown>,
    charId: string,
    charName: string,
    allowedStances: NpcStance[],
    whitelist: PressureAxisId[] | undefined,
  ): NpcAction {
    let degradeLevel: 0 | 1 | 2 | 3 = 0;

    // stance 校验
    let stance = (parsed.stance as NpcStance) ?? 'observe';
    if (!allowedStances.includes(stance)) {
      // Level 2：stance 不合法 → 降为第一个允许项，deltas 清零
      stance = allowedStances[0] ?? 'observe';
      degradeLevel = 2;
    }

    // 文本字段
    const action = typeof parsed.action === 'string' && parsed.action.trim()
      ? String(parsed.action).slice(0, 30)
      : `${charName}${stance}`;
    const description = typeof parsed.description === 'string'
      ? String(parsed.description).slice(0, 60)
      : action;
    const target = typeof parsed.target === 'string' ? String(parsed.target).slice(0, 20) : undefined;

    // cap 档位
    const caps = this.capsForStance(stance);

    // pressureDeltas 校验
    let pressureEffects: PressureModifier[] = [];
    if (degradeLevel < 2 && Array.isArray(parsed.pressureDeltas)) {
      const raw = parsed.pressureDeltas.slice(0, caps.maxCount) as Array<Record<string, unknown>>;
      for (const d of raw) {
        const axisId = d.axisId as PressureAxisId;
        const deltaNum = typeof d.delta === 'number' ? d.delta : Number(d.delta);
        if (!axisId || !Number.isFinite(deltaNum)) continue;
        if (whitelist && !whitelist.includes(axisId)) {
          // 白名单外丢该条（不 clamp）
          degradeLevel = Math.max(degradeLevel, 1) as 0 | 1 | 2 | 3;
          continue;
        }
        const clamped = Math.max(-caps.perDelta, Math.min(caps.perDelta, deltaNum));
        if (clamped !== deltaNum) degradeLevel = Math.max(degradeLevel, 1) as 0 | 1 | 2 | 3;
        pressureEffects.push({
          axisId,
          delta: clamped,
          reason: typeof d.reason === 'string' ? String(d.reason).slice(0, 40) : action,
          source: charId,
        });
      }

      // 总和 cap：超标按比例缩放
      const total = pressureEffects.reduce((s, e) => s + Math.abs(e.delta), 0);
      if (total > caps.totalAbs) {
        const scale = caps.totalAbs / total;
        pressureEffects = pressureEffects.map((e) => ({
          ...e,
          delta: Math.round(e.delta * scale * 10) / 10,
        }));
        degradeLevel = Math.max(degradeLevel, 1) as 0 | 1 | 2 | 3;
      }
    }

    return {
      characterId: charId,
      stance,
      action,
      description,
      target,
      pressureEffects,
      narrativeHook: description,
      degradeLevel,
    };
  }

  /**
   * Level 3 降级：JSON 异常或必填缺失，返回一条空 observe
   */
  private fallbackObserve(charId: string, allowedStances: NpcStance[]): NpcAction {
    const stance: NpcStance = allowedStances.includes('observe') ? 'observe' : (allowedStances[0] ?? 'observe');
    return {
      characterId: charId,
      stance,
      action: '按兵不动',
      description: '（LLM 输出异常，回退为观望）',
      pressureEffects: [],
      narrativeHook: '',
      degradeLevel: 3,
    };
  }

  private capsForStance(stance: NpcStance): { perDelta: number; totalAbs: number; maxCount: number } {
    if (stance === 'breakdown') return { perDelta: 8, totalAbs: 15, maxCount: 4 };
    if (stance === 'abandon')   return { perDelta: 6, totalAbs: 12, maxCount: 4 };
    if (stance === 'assassinate' || stance === 'capture' || stance === 'defy') return { perDelta: 5, totalAbs: 10, maxCount: 3 };
    if (stance === 'pressure' || stance === 'remonstrate' || stance === 'drill' || stance === 'rally' || stance === 'patrol') return { perDelta: 4, totalAbs: 7, maxCount: 3 };
    return { perDelta: 3, totalAbs: 5, maxCount: 3 };
  }

  private buildDailyBriefing(triggeredEvents: PendingEvent[]): string {
    const lines: string[] = [];
    lines.push(`【${formatDate(this.state.calendar)}】`);
    lines.push('');

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

  // --- 游戏结束检查（v3.4.4 委托给 endingResolver） ---

  private checkGameOver(): EndingType | null {
    const decision = resolveEnding(this.state);
    if (!decision) return null;
    this.endingDecision = decision;
    return decision.ending;
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
