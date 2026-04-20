import type { DebugLogEntry } from '../types';

type DebugLogListener = (entries: DebugLogEntry[]) => void;

const MAX_ENTRIES = 200;

let entries: DebugLogEntry[] = [];
const listeners = new Set<DebugLogListener>();

export function debugLog(category: DebugLogEntry['category'], title: string, detail?: string): void {
  if (!import.meta.env.DEV) return;
  entries.push({ timestamp: Date.now(), category, title, detail });
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(-MAX_ENTRIES);
  }
  for (const fn of listeners) fn(entries);
}

export function getDebugEntries(): DebugLogEntry[] {
  return entries;
}

export function subscribeDebugLog(listener: DebugLogListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function clearDebugLog(): void {
  entries = [];
  for (const fn of listeners) fn(entries);
}
