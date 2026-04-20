import type { LLMConfig } from '../types';

export const SETTINGS_STORAGE_KEY = 'xuanwumen_llm_config';

export function loadSavedConfig(): LLMConfig | null {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LLMConfig;
  } catch {
    return null;
  }
}
