import type { SceneConfig } from '../../types';

export const luoyangDebate: SceneConfig = {
  id: 'scene_luoyang_debate',
  time: '武德九年三月',
  location: '秦王府·书房',
  narratorIntro: [
    '武德九年，三月。',
    '',
    '一道旨意从太极宫传至秦王府，犹如惊雷炸响——',
    '陛下欲遣秦王赴洛阳，都督陕东道大行台，许以天子旌旗，位同藩王。',
    '',
    '此言传开，朝野震动。',
    '建成一党暗中弹冠相庆，秦王府上下却人心惶惶。',
    '',
    '去洛阳，则远离长安，避开杀身之祸，却也永失帝位根基；',
    '留长安，则继续在刀锋上行走，但机会与危险并存。',
    '',
    '长孙无忌与房玄龄紧急入府，此事关乎存亡，须得从长计议。',
  ].join('\n'),
  activeNpcIds: ['changsun_wuji', 'fang_xuanling'],
  phases: [
    {
      id: 'phase_edict',
      name: '天子之诏',
      turnRange: [1, 3],
      suggestedActions: [
        '分析陛下此举是恩赐还是驱逐',
        '推测建成元吉在背后的推动',
        '评估洛阳的实际控制力如何',
        '询问长孙无忌和房玄龄的看法',
      ],
    },
    {
      id: 'phase_debate',
      name: '众议纷纭',
      turnRange: [4, 6],
      suggestedActions: [
        '权衡去洛阳的利弊',
        '分析留在长安的风险',
        '讨论若去洛阳能否积蓄力量东山再起',
        '考虑上书婉拒的可能性',
      ],
    },
    {
      id: 'phase_decision',
      name: '去留抉择',
      turnRange: [7, 9],
      suggestedActions: [
        '做出最终决定：去还是留',
        '如果留下，如何向陛下回复',
        '安排应对建成可能的后续动作',
        '重新部署秦王府的力量',
      ],
    },
  ],
  endingTrigger: {
    minTurns: 5,
    maxTurns: 9,
  },
};
