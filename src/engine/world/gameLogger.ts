export interface LogEntry {
  day: number;
  dateStr: string;
  phase: string;
  detail: Record<string, unknown>;
}

export interface LLMCallRecord {
  ts: number;
  callId: string;
  type: string;
  params: Record<string, unknown>;
  response: string;
}

const STORAGE_KEY = 'xuanwumen_game_log';
const LLM_STORAGE_KEY = 'xuanwumen_game_log_llm';

let callSeq = 0;

export class GameLogger {
  private entries: LogEntry[] = [];
  private llmCalls: LLMCallRecord[] = [];

  log(day: number, dateStr: string, phase: string, detail: Record<string, unknown>): void {
    this.entries.push({ day, dateStr, phase, detail });
  }

  logLLMCall(type: string, params: Record<string, unknown>, response: string): void {
    callSeq++;
    this.llmCalls.push({
      ts: Date.now(),
      callId: `${Date.now()}-${callSeq}`,
      type,
      params,
      response,
    });
  }

  getEntries(): LogEntry[] {
    return this.entries;
  }

  getLLMCalls(): LLMCallRecord[] {
    return this.llmCalls;
  }

  save(): void {
    this.persistEntries();
    this.persistLLMCalls();
  }

  private persistEntries(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      // localStorage quota exceeded
    }
  }

  private persistLLMCalls(): void {
    try {
      localStorage.setItem(LLM_STORAGE_KEY, JSON.stringify(this.llmCalls));
    } catch {
      // localStorage quota exceeded
    }
  }

  clear(): void {
    this.entries = [];
    this.llmCalls = [];
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LLM_STORAGE_KEY);
  }

  exportJSON(): string {
    const data = {
      exportedAt: new Date().toISOString(),
      entries: this.entries,
      llmCalls: this.llmCalls,
    };
    return JSON.stringify(data, null, 2);
  }

  downloadJSON(): void {
    const json = this.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const filename = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-player-playthrough.json`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
