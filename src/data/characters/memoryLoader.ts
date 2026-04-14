import type { CharacterCore, Character, MemoryEntry, MemoryCategory } from '../../types';

// Vite 批量加载所有记忆 md 文件（构建时打包，无运行时 async）
const memoryModules = import.meta.glob('./memories/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** 解析单条记忆的 ## 块 */
function parseMemoryBlock(header: string, body: string, category: MemoryCategory): MemoryEntry | null {
  // header 格式: "武德元年 · 豪情"
  const headerMatch = header.match(/^(.+?)\s*·\s*(.+)$/);
  if (!headerMatch) return null;

  const date = headerMatch[1].trim();
  const emotionalTag = headerMatch[2].trim();

  // 从 body 中提取 importance 和 related
  let importance = 5;
  const importanceMatch = body.match(/^importance:\s*(\d+)/m);
  if (importanceMatch) importance = parseInt(importanceMatch[1], 10);

  const relatedCharacters: string[] = [];
  const relatedMatch = body.match(/^related:\s*(.+)/m);
  if (relatedMatch) {
    relatedCharacters.push(
      ...relatedMatch[1].split(',').map((s) => s.trim()).filter(Boolean),
    );
  }

  // 正文：去掉 importance 和 related 行
  const event = body
    .replace(/^importance:\s*\d+\s*$/m, '')
    .replace(/^related:\s*.+$/m, '')
    .trim();

  if (!event) return null;

  return {
    id: `mem_${date.replace(/\s+/g, '_')}_${Date.now().toString(36).slice(-4)}`,
    date,
    event,
    emotionalTag,
    importance,
    relatedCharacters,
    category,
    sceneId: undefined,
  };
}

/** 解析一个 md 文件，返回 MemoryEntry[] 和原始文本 */
function parseMemoryFile(raw: string): { entries: MemoryEntry[]; rawText: string } {
  const entries: MemoryEntry[] = [];

  // 解析 YAML frontmatter
  let category: MemoryCategory = 'foundational';
  let content = raw;

  const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (frontmatterMatch) {
    const fm = frontmatterMatch[1];
    content = frontmatterMatch[2];
    const catMatch = fm.match(/^category:\s*(.+)/m);
    if (catMatch) category = catMatch[1].trim() as MemoryCategory;
  }

  // 按 ## 分割记忆块
  const blocks = content.split(/^## /m).filter(Boolean);
  for (const block of blocks) {
    const newlineIdx = block.indexOf('\n');
    if (newlineIdx === -1) continue;
    const header = block.slice(0, newlineIdx).trim();
    const body = block.slice(newlineIdx + 1).trim();
    const entry = parseMemoryBlock(header, body, category);
    if (entry) entries.push(entry);
  }

  return { entries, rawText: content.trim() };
}

/** 加载指定角色的所有记忆文件 */
export function loadMemoriesForCharacter(characterId: string): {
  foundational: MemoryEntry[];
  foundationalRaw: string;
} {
  const foundational: MemoryEntry[] = [];
  let foundationalRaw = '';

  for (const [path, content] of Object.entries(memoryModules)) {
    // 路径格式: ./memories/li_shimin/foundational.md
    if (!path.includes(`/${characterId}/`)) continue;

    const { entries, rawText } = parseMemoryFile(content);

    if (path.endsWith('foundational.md')) {
      foundational.push(...entries);
      foundationalRaw = rawText;
    }
  }

  return { foundational, foundationalRaw };
}

/** 将 CharacterCore + 记忆 md 合并为完整的 Character */
export function assembleCharacter(core: CharacterCore): Character {
  const memories = loadMemoriesForCharacter(core.id);
  return {
    ...core,
    foundationalMemory: memories.foundational,
    shortTermMemory: [],
    reflections: [],
  };
}
