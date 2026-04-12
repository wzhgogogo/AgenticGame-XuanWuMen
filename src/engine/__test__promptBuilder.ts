/**
 * promptBuilder 冒烟测试
 * 运行方式: 在 App.tsx 中 import { testPromptBuilder } from './engine/__test__promptBuilder'
 * 然后调用 testPromptBuilder() 查看 console 输出
 */

import { characters, getPlayerCharacter, getNpcCharacters } from '../data/characters';
import { defaultScene as sceneConfig } from '../data/scenes';
import { buildSystemPrompt, buildUserMessages, buildFirstNpcMessage } from './promptBuilder';
import type { DialogueEntry, GameState } from '../types';

export function testPromptBuilder(): void {
  console.log('========== promptBuilder 测试开始 ==========\n');

  // 1. 测试角色数据完整性
  console.log(`[1] 角色数量: ${characters.length}`);
  console.log(`    玩家角色: ${getPlayerCharacter().name}`);
  console.log(`    NPC角色: ${getNpcCharacters().map((c) => c.name).join('、')}`);
  console.log('');

  // 2. 测试 buildSystemPrompt
  const systemPrompt = buildSystemPrompt(sceneConfig, characters, 0);
  console.log('[2] buildSystemPrompt (phase 0) 输出长度:', systemPrompt.length, '字');
  console.log('--- 系统提示词前500字 ---');
  console.log(systemPrompt.slice(0, 500));
  console.log('--- ... ---\n');

  // 3. 测试 buildFirstNpcMessage
  const firstMsg = buildFirstNpcMessage(sceneConfig);
  console.log('[3] buildFirstNpcMessage:');
  console.log(`    role: ${firstMsg.role}`);
  console.log(`    content 前200字: ${firstMsg.content.slice(0, 200)}`);
  console.log('');

  // 4. 测试 buildUserMessages (模拟对话)
  const mockHistory: DialogueEntry[] = [
    {
      id: 'd1',
      type: 'narrator',
      content: '烛火摇曳，三位心腹已在密室中等候。',
      timestamp: Date.now(),
    },
    {
      id: 'd2',
      type: 'npc',
      speaker: 'changsun_wuji',
      speakerName: '长孙无忌',
      content: '殿下，事态紧急，建成明日便要动手了。',
      color: '#87CEEB',
      timestamp: Date.now(),
    },
    {
      id: 'd3',
      type: 'player',
      speaker: 'li_shimin',
      speakerName: '李世民',
      content: '无忌，你且细说，消息可确实？',
      color: '#FFD700',
      timestamp: Date.now(),
    },
    {
      id: 'd4',
      type: 'npc',
      speaker: 'weichi_jingde',
      speakerName: '尉迟敬德',
      content: '殿下！还等什么！再犹豫，咱们的人头明天就挂在城门上了！',
      color: '#FF6347',
      timestamp: Date.now(),
    },
  ];

  const mockState: GameState = {
    status: 'playing',
    dialogueHistory: mockHistory,
    llmMessages: [],
    playerTurnCount: 1,
    currentPhaseIndex: 0,
    isNpcThinking: false,
  };

  const messages = buildUserMessages(mockHistory, mockState);
  console.log('[4] buildUserMessages 输出:');
  for (const msg of messages) {
    console.log(`    [${msg.role}] ${msg.content.slice(0, 80)}...`);
  }
  console.log('');

  // 5. 测试不同 phase
  for (let i = 0; i < sceneConfig.phases.length; i++) {
    const prompt = buildSystemPrompt(sceneConfig, characters, i);
    const phase = sceneConfig.phases[i];
    console.log(`[5.${i + 1}] Phase "${phase.name}" 系统提示词长度: ${prompt.length} 字`);
  }

  console.log('\n========== promptBuilder 测试完成 ==========');
}
