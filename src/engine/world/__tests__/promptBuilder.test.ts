import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildMessages } from '../promptBuilder';
import type { SceneConfig, Character } from '../../../types';

const mockPlayer: Character = {
  id: 'li_shimin',
  name: '李世民',
  title: '秦王',
  role: 'player_character',
  faction: '秦王府',
  age: 27,
  identity: {
    oneLiner: '秦王',
    personality: { traitKeywords: ['果断'] },
    skills: [],
    speechStyle: { register: '文雅', patterns: [], never: [] },
  },
  foundationalMemory: [],
  shortTermMemory: [],
  reflections: [],
  relationships: {},
  goals: { longTerm: '夺位', shortTerm: ['生存'], internalConflict: '兄弟之争' },
} as unknown as Character;

const mockNpc: Character = {
  id: 'changsun_wuji',
  name: '长孙无忌',
  title: '谋士',
  role: 'npc',
  faction: '秦王府',
  age: 32,
  identity: {
    oneLiner: '谋士',
    personality: { traitKeywords: ['谨慎'] },
    skills: [],
    speechStyle: { register: '稳重', patterns: [], never: [] },
  },
  foundationalMemory: [],
  shortTermMemory: [],
  reflections: [],
  relationships: {},
  goals: { longTerm: '辅佐', shortTerm: ['谋划'], internalConflict: '忠义' },
} as unknown as Character;

const mockScene: SceneConfig = {
  id: 'test_scene',
  time: '武德九年·二月·初三',
  location: '秦王府',
  narratorIntro: '测试开场',
  narrativeConstraint: '',
  phases: [{
    id: 'phase_1',
    name: '开幕',
    turnRange: [1, 3] as [number, number],
    suggestedActions: ['观察', '试探'],
  }],
  endingTrigger: { minTurns: 5, maxTurns: 8 },
  participantIds: ['li_shimin', 'changsun_wuji'],
} as unknown as SceneConfig;

describe('buildSystemPrompt', () => {
  it('contains narrator forbidden-future-events rule', () => {
    const prompt = buildSystemPrompt(mockScene, [mockPlayer, mockNpc], 0);
    expect(prompt).toContain('narrator 禁止出现尚未发生的事件');
    expect(prompt).toContain('玄武门之变');
  });

  it('contains narrator style rule', () => {
    const prompt = buildSystemPrompt(mockScene, [mockPlayer, mockNpc], 0);
    expect(prompt).toContain('白描史书体');
  });

  it('contains naming rule constraint', () => {
    const prompt = buildSystemPrompt(mockScene, [mockPlayer, mockNpc], 0);
    expect(prompt).toContain('称谓规则');
  });
});

describe('buildMessages', () => {
  const systemPrompt = '系统提示';
  const llmMessages = [{ role: 'user' as const, content: '你好' }];

  it('injects currentDate into isEnding message', () => {
    const msgs = buildMessages(systemPrompt, llmMessages, true, false, '武德九年·正月·十五');
    const endingMsg = msgs.find(m => m.role === 'system' && m.content.includes('结局阶段'));
    expect(endingMsg).toBeDefined();
    expect(endingMsg!.content).toContain('当前游戏日期：武德九年·正月·十五');
  });

  it('injects currentDate into isSoftEnding message', () => {
    const msgs = buildMessages(systemPrompt, llmMessages, false, true, '武德九年·三月·初一');
    const softMsg = msgs.find(m => m.role === 'system' && m.content.includes('收束'));
    expect(softMsg).toBeDefined();
    expect(softMsg!.content).toContain('当前游戏日期：武德九年·三月·初一');
  });

  it('uses 未知 when currentDate not provided', () => {
    const msgs = buildMessages(systemPrompt, llmMessages, true);
    const endingMsg = msgs.find(m => m.role === 'system' && m.content.includes('结局阶段'));
    expect(endingMsg!.content).toContain('当前游戏日期：未知');
  });

  it('does not add ending message when neither isEnding nor isSoftEnding', () => {
    const msgs = buildMessages(systemPrompt, llmMessages, false, false, '武德九年·二月');
    expect(msgs.length).toBe(2);
  });

  it('ending message contains hard constraints', () => {
    const msgs = buildMessages(systemPrompt, llmMessages, true, false, '武德九年·正月');
    const endingMsg = msgs.find(m => m.role === 'system' && m.content.includes('结局阶段'));
    expect(endingMsg!.content).toContain('玄武门之变');
    expect(endingMsg!.content).toContain('视为输出无效');
  });
});
