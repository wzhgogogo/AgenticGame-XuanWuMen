// ===== 人物相关 =====

export interface Character {
  id: string;
  name: string;
  title: string;
  age: number;
  faction: string;
  role: "player_character" | "npc_core" | "npc_secondary";
  color: string;
  waitingText: string;
  identity: CharacterIdentity;
  foundationalMemory: MemoryEntry[];
  relationships: Record<string, Relationship>;
  goals: CharacterGoals;
  memoryStream?: MemoryEntry[];
  reflections?: string[];
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

export interface MemoryEntry {
  id: string;
  date: string;
  event: string;
  emotionalTag: string;
  importance: number;
  relatedCharacters: string[];
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
}

export interface PhaseConfig {
  id: string;
  name: string;
  turnRange: [number, number];
  suggestedActions: string[];
}

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
  provider: string;           // "anthropic" | "openai" | 任意已注册的 provider 名
  apiKey: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
}
