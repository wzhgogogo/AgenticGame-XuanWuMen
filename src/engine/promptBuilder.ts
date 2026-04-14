import type { Character, SceneConfig, SceneOutcome, DialogueEntry, GameState } from '../types';
import type { LLMMessage } from './llm/types';

// ===== 内部辅助：构建角色描述块（三层记忆） =====

function buildCharacterBlock(character: Character): string {
  const lines: string[] = [];

  lines.push(`【${character.name}·${character.title}】`);
  lines.push(`阵营: ${character.faction} | 年龄: ${character.age}`);
  lines.push(`定位: ${character.identity.oneLiner}`);
  lines.push('');

  // 性格
  lines.push('性格特征: ' + character.identity.personality.traitKeywords.join('、'));
  lines.push('');

  // 技能
  lines.push('核心能力:');
  for (const skill of character.identity.skills) {
    lines.push(`  - ${skill.name} (${skill.level}/100): ${skill.note}`);
  }
  lines.push('');

  // 说话风格
  lines.push(`语言风格: ${character.identity.speechStyle.register}`);
  lines.push('口癖/习惯: ' + character.identity.speechStyle.patterns.join('；'));
  lines.push('绝不会说: ' + character.identity.speechStyle.never.join('；'));
  lines.push('');

  // 基础记忆
  if (character.foundationalMemory.length > 0) {
    lines.push('关键记忆:');
    for (const mem of character.foundationalMemory) {
      lines.push(`  - [${mem.date}] ${mem.event} (${mem.emotionalTag})`);
    }
    lines.push('');
  }

  // 短期记忆（跨场景积累）
  if (character.shortTermMemory.length > 0) {
    lines.push('近期记忆:');
    for (const mem of character.shortTermMemory) {
      lines.push(`  - [${mem.date}] ${mem.event} (${mem.emotionalTag})`);
    }
    lines.push('');
  }

  // 反思
  if (character.reflections.length > 0) {
    lines.push('内心反思:');
    for (const ref of character.reflections) {
      lines.push(`  - ${ref}`);
    }
    lines.push('');
  }

  // 人际关系
  const relIds = Object.keys(character.relationships);
  if (relIds.length > 0) {
    lines.push('人际关系:');
    for (const relId of relIds) {
      const rel = character.relationships[relId];
      lines.push(`  - ${rel.role}: 信任度${rel.trust}/100 — ${rel.dynamics}`);
      if (rel.tension) {
        lines.push(`    潜在张力: ${rel.tension}`);
      }
    }
    lines.push('');
  }

  // 目标
  lines.push(`长期目标: ${character.goals.longTerm}`);
  lines.push('短期目标: ' + character.goals.shortTerm.join('；'));
  lines.push(`内心冲突: ${character.goals.internalConflict}`);

  return lines.join('\n');
}

// ===== 导出：构建系统提示词 =====

export function buildSystemPrompt(
  scene: SceneConfig,
  characters: Character[],
  phaseIndex: number,
  previousSceneSummary?: string,
): string {
  const phase = scene.phases[phaseIndex] ?? scene.phases[0];
  const npcs = characters.filter((c) => c.role !== 'player_character');
  const player = characters.find((c) => c.role === 'player_character');

  const sections: string[] = [];

  // 1. 角色设定
  sections.push(`你是一个历史互动叙事游戏的AI叙事引擎。你同时扮演多个NPC角色与旁白。
你必须严格保持每个NPC的性格、语言风格和立场，绝不混淆。

===== 称谓与人物关系规则（所有角色必须遵守） =====

正式称谓：
NPC称呼皇帝李渊→"陛下"或"圣上"。
NPC称呼太子李建成→"太子"或"太子殿下"。
NPC称呼齐王李元吉→"齐王"。
NPC称呼秦王李世民→"殿下"或"秦王"。
NPC称呼淮安王李神通→"淮安王"。

亲属称呼（仅限玩家角色李世民使用）：
李世民称李渊→"父皇"。
李世民称李建成→"大哥"或"太子"。
李世民称李元吉→"四弟"或"齐王"。
李世民称李神通→"叔父"。

其他皇族互称：
李建成称李世民→"二郎"或"秦王"。
李元吉称李世民→"二哥"或"秦王"。
李神通称李世民→"世民"或"秦王"（叔侄关系，非兄弟）。

配角行为规范：
旁白中出现的非NPC人物（如李神通、傅奕、李建成、李元吉等）须符合其历史身份和地位。皇族成员不可出现跪求、哀求等不合身份的描写。`);

  // 1.5 前情回顾（跨场景时注入）
  if (previousSceneSummary) {
    sections.push(previousSceneSummary);
  }

  // 2. 场景信息
  sections.push(`===== 场景 =====
场景: ${scene.id}
时间: ${scene.time}
地点: ${scene.location}
当前阶段: ${phase.name}（第${phase.turnRange[0]}~${phase.turnRange[1]}回合）`);

  // 3. 玩家角色
  if (player) {
    sections.push(`===== 玩家角色 =====
${buildCharacterBlock(player)}`);
  }

  // 4. NPC角色
  sections.push('===== NPC角色 =====');
  for (const npc of npcs) {
    sections.push(buildCharacterBlock(npc));
    sections.push('---');
  }

  // 5. 输出格式要求
  const npcIdList = npcs.map((n) => n.id).join('、');
  sections.push(`===== 输出格式 =====
你的每次回复必须严格遵循以下JSON格式，不要输出其他内容:

{
  "narrator": "旁白文本，描述场景氛围、角色神态动作等（1-3句）",
  "npcDialogues": [
    {
      "characterId": "${npcs[0]?.id || 'npc_id'}",
      "content": "该NPC的台词（符合其语言风格）"
    }
  ],
  "suggestedActions": ["玩家可选行动1", "玩家可选行动2", "玩家可选行动3"]
}

规则:
- narrator: 用第三人称描写，营造历史氛围，不超过3句
- npcDialogues: 包含1~${npcs.length}个NPC的回应，根据剧情需要选择哪些NPC发言。不是每个NPC每轮都必须说话
- characterId 只能使用以下值：${npcIdList}
- suggestedActions: 提供2~4个玩家可选的行动建议，符合当前阶段的剧情走向
- 每个NPC的台词必须符合其性格和语言风格设定
- 当前阶段建议行动方向: ${phase.suggestedActions.join('、')}`);

  // 6. 结局触发
  sections.push(`===== 结局机制 =====
当对话回合数达到${scene.endingTrigger.minTurns}~${scene.endingTrigger.maxTurns}回合时，根据玩家的选择生成结局。
到达结局时，在JSON中增加 "ending" 字段:
{
  "narrator": "最终旁白",
  "npcDialogues": [...],
  "suggestedActions": [],
  "ending": "结局描述文本（200-400字）"
}`);

  return sections.join('\n\n');
}

// ===== 导出：组装完整 LLM 消息数组 =====

export function buildMessages(
  systemPrompt: string,
  llmMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  isEnding: boolean,
): LLMMessage[] {
  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...llmMessages.map((m) => ({ role: m.role as LLMMessage['role'], content: m.content })),
  ];

  if (isEnding) {
    messages.push({
      role: 'system',
      content: '现在已经到达结局阶段。请根据之前的对话内容，在本轮回复的JSON中加入 "ending" 字段，撰写200-400字的结局描述。suggestedActions 设为空数组。',
    });
  }

  return messages;
}

// ===== 导出：构建对话历史消息列表 =====

export function buildUserMessages(
  dialogueHistory: DialogueEntry[],
  _gameState: GameState,
): LLMMessage[] {
  const messages: LLMMessage[] = [];

  for (const entry of dialogueHistory) {
    if (entry.type === 'player') {
      messages.push({
        role: 'user',
        content: entry.content,
      });
    } else if (entry.type === 'npc' || entry.type === 'narrator') {
      // NPC回复和旁白都是assistant的输出
      // 合并连续的assistant消息
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant') {
        last.content += '\n' + entry.content;
      } else {
        messages.push({
          role: 'assistant',
          content: entry.content,
        });
      }
    }
  }

  return messages;
}

// ===== 导出：构建NPC首条消息 =====

export function buildFirstNpcMessage(scene: SceneConfig): LLMMessage {
  return {
    role: 'user',
    content: `场景开始。旁白引入：\n\n${scene.narratorIntro}\n\n请以旁白+NPC对话的JSON格式开始第一轮对话。这是密议的开场，NPC们刚刚到齐，气氛紧张。`,
  };
}

// ===== 导出：构建前情回顾 =====

export function buildPreviousSceneSummary(completedScenes: SceneOutcome[]): string {
  if (completedScenes.length === 0) return '';

  const lines: string[] = ['===== 前情回顾 ====='];

  for (const outcome of completedScenes) {
    lines.push(`【${outcome.sceneId}】`);
    lines.push(outcome.summary);

    if (outcome.keyDecisions.length > 0) {
      lines.push('关键决策:');
      for (const d of outcome.keyDecisions) {
        lines.push(`  - ${d.description}`);
      }
    }

    if (outcome.relationshipDeltas.length > 0) {
      lines.push('人际变化:');
      for (const rd of outcome.relationshipDeltas) {
        const sign = rd.trustChange > 0 ? '+' : '';
        lines.push(`  - ${rd.characterId} 对 ${rd.targetId} 信任度 ${sign}${rd.trustChange}（${rd.reason}）`);
      }
    }

    lines.push('');
  }

  lines.push('请在本场景中考虑以上前情，保持叙事连贯性。NPC 应根据之前的事件调整态度和对话内容。');

  return lines.join('\n');
}
