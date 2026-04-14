import type {
  CampaignState, TimelineConfig, SceneConfig,
  SceneTransition, SceneOutcome, Character, GameState,
  ISceneManager, SceneManagerFactory, MemoryEntry,
} from '../types';
import { buildSceneOutcome } from './outcomeBuilder';
import { buildPreviousSceneSummary } from './promptBuilder';

type CampaignListener = (state: CampaignState) => void;

export class CampaignManager {
  private state: CampaignState;
  private listeners: Set<CampaignListener> = new Set();

  private timeline: TimelineConfig;
  private scenes: SceneConfig[];
  private transitions: SceneTransition[];
  private characters: Character[];
  private player: Character;
  private createSceneManager: SceneManagerFactory;

  private currentSceneManager: ISceneManager | null = null;
  private sceneEndUnsubscribe: (() => void) | null = null;

  constructor(
    timeline: TimelineConfig,
    scenes: SceneConfig[],
    transitions: SceneTransition[],
    factory: SceneManagerFactory,
    characters: Character[],
    player: Character,
  ) {
    this.timeline = timeline;
    this.scenes = scenes;
    this.transitions = transitions;
    this.createSceneManager = factory;
    this.characters = characters;
    this.player = player;

    this.state = {
      status: 'not_started',
      timelineId: timeline.id,
      currentSceneIndex: 0,
      completedScenes: [],
      activeGameState: null,
    };
  }

  // --- 只读访问 ---

  getState(): CampaignState {
    return this.state;
  }

  getCurrentSceneManager(): ISceneManager | null {
    return this.currentSceneManager;
  }

  getCurrentScene(): SceneConfig | null {
    const sceneId = this.timeline.sceneOrder[this.state.currentSceneIndex];
    return this.scenes.find((s) => s.id === sceneId) || null;
  }

  isLastScene(): boolean {
    return this.state.currentSceneIndex >= this.timeline.sceneOrder.length - 1;
  }

  getTransitionToNext(): SceneTransition | null {
    if (this.isLastScene()) return null;
    const fromId = this.timeline.sceneOrder[this.state.currentSceneIndex];
    const toId = this.timeline.sceneOrder[this.state.currentSceneIndex + 1];
    return this.transitions.find(
      (t) => t.fromSceneId === fromId && t.toSceneId === toId,
    ) || null;
  }

  // --- 订阅 ---

  subscribe(listener: CampaignListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  // --- 生命周期 ---

  async startCampaign(): Promise<void> {
    this.setState({ status: 'in_scene', currentSceneIndex: 0 });
    await this.startCurrentScene();
  }

  async advanceToNextScene(): Promise<void> {
    if (this.isLastScene()) {
      this.setState({ status: 'completed' });
      return;
    }

    const nextIndex = this.state.currentSceneIndex + 1;
    this.setState({ status: 'in_scene', currentSceneIndex: nextIndex });
    await this.startCurrentScene();
  }

  // --- 内部 ---

  private async startCurrentScene(): Promise<void> {
    // 清理上一个场景的订阅
    if (this.sceneEndUnsubscribe) {
      this.sceneEndUnsubscribe();
      this.sceneEndUnsubscribe = null;
    }

    const scene = this.getCurrentScene();
    if (!scene) {
      this.setState({ status: 'completed' });
      return;
    }

    // 筛选当前场景的 NPC
    const npcs = this.characters.filter(
      (c) => c.role !== 'player_character' && scene.activeNpcIds.includes(c.id),
    );

    // 构建前情回顾
    const summary = buildPreviousSceneSummary(this.state.completedScenes);

    // 创建 SceneManager
    const manager = this.createSceneManager(scene, npcs, this.player, summary || undefined);
    this.currentSceneManager = manager;

    // 监听场景状态，检测结局
    this.sceneEndUnsubscribe = manager.subscribe((gameState: GameState) => {
      this.setState({ activeGameState: gameState });

      if (gameState.status === 'ending' && gameState.endingText) {
        this.handleSceneEnd(scene.id, gameState);
      }
    });

    await manager.startGame();
  }

  private handleSceneEnd(sceneId: string, gameState: GameState): void {
    // 提取场景结果
    const outcome = buildSceneOutcome(sceneId, gameState);

    // 应用关系变化
    this.applyRelationshipDeltas(outcome);

    // 生成短期记忆
    this.generateShortTermMemories(outcome);

    // 更新状态
    const completedScenes = [...this.state.completedScenes, outcome];

    if (this.isLastScene()) {
      this.setState({ status: 'completed', completedScenes });
    } else {
      this.setState({ status: 'transitioning', completedScenes });
    }
  }

  private applyRelationshipDeltas(outcome: SceneOutcome): void {
    for (const delta of outcome.relationshipDeltas) {
      const character = this.characters.find((c) => c.id === delta.characterId);
      if (character && character.relationships[delta.targetId]) {
        character.relationships[delta.targetId].trust = Math.max(
          0,
          Math.min(100, character.relationships[delta.targetId].trust + delta.trustChange),
        );
      }
    }
  }

  private generateShortTermMemories(outcome: SceneOutcome): void {
    const memoryBase: Omit<MemoryEntry, 'id' | 'relatedCharacters'> = {
      date: this.getCurrentScene()?.time || '',
      event: outcome.summary.slice(0, 100),
      emotionalTag: '回忆',
      importance: 7,
      category: 'short_term',
      sceneId: outcome.sceneId,
    };

    // 给每个角色添加短期记忆
    for (const character of this.characters) {
      const mem: MemoryEntry = {
        ...memoryBase,
        id: `stm_${outcome.sceneId}_${character.id}`,
        relatedCharacters: this.characters
          .filter((c) => c.id !== character.id)
          .map((c) => c.id),
      };
      character.shortTermMemory.push(mem);
    }
  }

  private setState(partial: Partial<CampaignState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const fn of this.listeners) {
      fn(this.state);
    }
  }
}
