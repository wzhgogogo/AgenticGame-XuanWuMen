import type { SceneConfig } from '../../types';

export const midnightCouncil: SceneConfig = {
  id: 'scene_midnight_council',
  time: '武德九年六月初三夜',
  location: '秦王府 · 密室',
  narratorIntro: [
    '武德九年，六月初三，夜。',
    '',
    '长安城万籁俱寂，唯有秦王府深处一间密室灯火通明。',
    '今日白天，东宫率更丞王晊冒死来报：太子建成与齐王元吉密谋，',
    '欲在明日昆明池饯行之时，伏杀秦王，坑杀秦王府众人。',
    '',
    '消息传来，秦王府上下震动。',
    '长孙无忌、尉迟敬德、房玄龄三人被紧急召入密室。',
    '窗外月色如霜，室内烛火摇曳。',
    '',
    '这一夜的密议，将决定大唐的命运。',
  ].join('\n'),
  activeNpcIds: ['changsun_wuji', 'weichi_jingde', 'fang_xuanling'],
  phases: [
    {
      id: 'phase_crisis',
      name: '危机揭示',
      turnRange: [1, 4],
      suggestedActions: [
        '询问建成的暗杀计划细节',
        '分析当前形势的危急程度',
        '表达对兄弟相残的犹豫',
        '试探众人的态度',
      ],
    },
    {
      id: 'phase_debate',
      name: '激辩定策',
      turnRange: [5, 10],
      suggestedActions: [
        '讨论先发制人的可行性',
        '分析玄武门地形的优势',
        '商定行动时间和人员分工',
        '考虑事变后如何安抚朝臣',
        '质问某人的立场或动机',
      ],
    },
    {
      id: 'phase_resolve',
      name: '最终决断',
      turnRange: [11, 15],
      suggestedActions: [
        '下达最终命令',
        '安排各人职责',
        '立下生死之誓',
        '或选择放弃政变',
      ],
    },
  ],
  endingTrigger: {
    minTurns: 10,
    maxTurns: 15,
  },
};
