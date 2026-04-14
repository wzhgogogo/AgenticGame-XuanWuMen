import type { SceneConfig } from '../../types';

export const taibaiOmen: SceneConfig = {
  id: 'scene_taibai_omen',
  time: '武德九年六月初一',
  location: '太极宫 · 朝堂',
  narratorIntro: [
    '武德九年，六月初一，辰时。',
    '',
    '长安城上空万里无云，烈日当头。',
    '然而就在正午时分，群臣惊见一道异象——',
    '太白金星赫然出现在白昼的天穹之上，光芒灼目，与日争辉。',
    '',
    '太史令傅奕伏地急奏：',
    '"太白见秦分，秦王当有天下。"',
    '',
    '此言一出，满朝皆惊。',
    '太子建成面色铁青，齐王元吉目露杀机。',
    '秦王李世民立于朝班之中，如坐针毡。',
    '',
    '陛下随即召秦王入两仪殿，面色阴沉，要求世民解释天象之意。',
    '这既是危局，也是最后的机会——',
    '秦王手中，还握着一张未曾打出的底牌。',
  ].join('\n'),
  activeNpcIds: ['changsun_wuji', 'weichi_jingde', 'fang_xuanling'],
  phases: [
    {
      id: 'phase_court_shock',
      name: '朝堂惊变',
      turnRange: [1, 3],
      suggestedActions: [
        '向傅奕追问天象的详细含义',
        '观察太子建成和齐王元吉的神色',
        '以臣子之礼向陛下表忠心',
        '与长孙无忌交换一个眼神',
      ],
    },
    {
      id: 'phase_face_emperor',
      name: '面圣对峙',
      turnRange: [4, 6],
      suggestedActions: [
        '向陛下揭露建成元吉淫乱后宫之事',
        '先试探陛下的态度再决定是否摊牌',
        '只为天象辩解，暂不亮底牌',
        '请求陛下明日召兄弟当庭对峙',
      ],
    },
    {
      id: 'phase_seize_initiative',
      name: '伺机而动',
      turnRange: [7, 9],
      suggestedActions: [
        '评估面圣后的局面变化',
        '讨论陛下明日对峙的安排意味着什么',
        '安排人手打探东宫今夜的动向',
        '商定明日的应对策略',
      ],
    },
  ],
  endingTrigger: {
    minTurns: 5,
    maxTurns: 9,
  },
};
