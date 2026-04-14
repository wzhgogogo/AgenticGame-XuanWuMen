import type { SceneConfig } from '../../types';

export const poisonedWine: SceneConfig = {
  id: 'scene_poisoned_wine',
  time: '武德九年二月',
  location: '东宫·宴厅',
  narratorIntro: [
    '武德九年，二月。',
    '',
    '一封烫金请帖自东宫送至秦王府——',
    '太子建成设宴，邀秦王赴东宫夜饮，言辞恳切，称兄弟久疏当叙旧情。',
    '',
    '消息传来，秦王府众人神色各异。',
    '据悉齐王元吉亦将出席，淮安王李神通同受邀在列。',
    '李神通乃高祖从弟、秦王叔父，宗室重臣，素来持重。',
    '席间当有太子心腹数人作陪，阵势不小。',
    '',
    '赴宴，则入虎穴；不赴，则失礼于兄长，授人以柄。',
    '是去是留，须得拿个主意。',
  ].join('\n'),
  activeNpcIds: ['changsun_wuji', 'weichi_jingde', 'fang_xuanling'],
  phases: [
    {
      id: 'phase_before_feast',
      name: '宴前密议',
      turnRange: [1, 3],
      suggestedActions: [
        '分析建成设宴的真实意图',
        '讨论是否赴宴',
        '安排赴宴时的随身护卫',
        '让人提前探查东宫布置',
      ],
    },
    {
      id: 'phase_feast',
      name: '鸿门之宴',
      turnRange: [4, 6],
      suggestedActions: [
        '酒已斟满，举杯还是放下',
        '观察席间众人的神色举止',
        '与建成周旋试探',
        '寻找脱身的时机',
      ],
    },
    {
      id: 'phase_aftermath',
      name: '宴后风波',
      turnRange: [7, 9],
      suggestedActions: [
        '回府后商议如何应对',
        '是否将鸩酒之事上告陛下',
        '安排府中加强戒备',
        '重新评估与建成的关系',
      ],
    },
  ],
  endingTrigger: {
    minTurns: 5,
    maxTurns: 9,
  },
};
