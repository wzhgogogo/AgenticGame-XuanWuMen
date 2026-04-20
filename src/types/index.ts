// ===== 人物相关 =====

export type CharacterRole = "player_character" | "npc_core" | "npc_secondary";

/** TS 文件导出的角色核心元数据（不含记忆） */
export interface CharacterCore {
  id: string;
  name: string;
  title: string;
  age: number;
  faction: string;
  role: CharacterRole;
  color: string;
  waitingText: string;
  identity: CharacterIdentity;
  relationships: Record<string, Relationship>;
  goals: CharacterGoals;
}

/** 运行时完整角色 = 核心 + 三层记忆 */
export interface Character extends CharacterCore {
  foundationalMemory: MemoryEntry[];
  shortTermMemory: MemoryEntry[];
  reflections: string[];
}

export interface CharacterIdentity {
  oneLiner: string;
  personality: {
    model: string;
    scores: Record<string, number>;
    traitKeywords: string[];
  };
  skills: Array<{ name: string; level: number; note: string }>;
  speechStyle: {
    register: string;
    patterns: string[];
    never: string[];
  };
}

export type MemoryCategory = "foundational" | "short_term" | "reflection";

export interface MemoryEntry {
  id: string;
  date: string;
  event: string;
  emotionalTag: string;
  importance: number;
  relatedCharacters: string[];
  category: MemoryCategory;
  sceneId?: string;
}

export interface Relationship {
  role: string;
  trust: number;
  dynamics: string;
  tension: string;
}

export interface CharacterGoals {
  longTerm: string;
  shortTerm: string[];
  internalConflict: string;
}

// ===== 场景相关 =====

export interface SceneConfig {
  id: string;
  time: string;
  location: string;
  narratorIntro: string;
  activeNpcIds: string[];
  phases: PhaseConfig[];
  endingTrigger: {
    minTurns: number;
    maxTurns: number;
  };
  narrativeConstraint?: string;
}

export interface PhaseConfig {
  id: string;
  name: string;
  turnRange: [number, number];
  suggestedActions: string[];
}

// ===== 时间线 / 战役系统 =====

export interface TimelineConfig {
  id: string;
  name: string;
  description: string;
  sceneOrder: string[];
}

export interface SceneTransition {
  fromSceneId: string;
  toSceneId: string;
  transitionNarration: string;
}

export interface SceneOutcome {
  sceneId: string;
  summary: string;
  keyDecisions: Decision[];
  relationshipDeltas: RelationshipDelta[];
  turnCount: number;
}

export interface Decision {
  id: string;
  description: string;
  turn: number;
}

export interface RelationshipDelta {
  characterId: string;
  targetId: string;
  trustChange: number;
  reason: string;
}

export type CampaignStatus = "not_started" | "in_scene" | "transitioning" | "completed";

export interface CampaignState {
  status: CampaignStatus;
  timelineId: string;
  currentSceneIndex: number;
  completedScenes: SceneOutcome[];
  activeGameState: GameState | null;
}

/** SceneManager 的接口抽象（CampaignManager 通过此接口操作，不直接 import SceneManager） */
export interface ISceneManager {
  getState(): GameState;
  subscribe(listener: (state: GameState) => void): () => void;
  getSuggestedActions(): string[];
  startGame(): Promise<void>;
  submitPlayerAction(input: string): Promise<void>;
}

export type SceneManagerFactory = (
  scene: SceneConfig,
  npcs: Character[],
  player: Character,
  previousSceneSummary?: string,
) => ISceneManager;

// ===== 对话相关 =====

export interface DialogueEntry {
  id: string;
  type: "narrator" | "npc" | "player" | "scene_action";
  speaker?: string;
  speakerName?: string;
  content: string;
  color?: string;
  timestamp: number;
}

// ===== 游戏状态 =====

export type GameStatus = "intro" | "playing" | "ending";

export interface GameState {
  status: GameStatus;
  dialogueHistory: DialogueEntry[];
  llmMessages: Array<{ role: "user" | "assistant"; content: string }>;
  playerTurnCount: number;
  currentPhaseIndex: number;
  isNpcThinking: boolean;
  endingText?: string;
}

// ===== LLM 相关 =====

export interface LLMConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
}

// ===== Debug =====

export interface DebugLogEntry {
  timestamp: number;
  category: 'llm_call' | 'npc_decision' | 'event_trigger' | 'pressure' | 'memory' | 'system';
  title: string;
  detail?: string;
}
