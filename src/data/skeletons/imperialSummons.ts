import type { EventSkeleton } from '../../types/world';

/** 皇帝召见：李渊过问、调停、训斥或试探 */
export const imperialSummons: EventSkeleton = {
  id: 'skeleton_imperial_summons',
  category: '皇帝召见',
  description: '李渊单独召见秦王，可能是训斥、试探、调停或另有深意。',

  preconditions: [
    { type: 'day_range', params: { minDay: 15, maxDay: 180 } },
  ],
  pressureTriggers: [
    {
      axes: [
        { axisId: 'imperial_suspicion', weight: 1.0, threshold: 55 },
      ],
    },
    {
      axes: [
        { axisId: 'succession_crisis', weight: 1.0, threshold: 80 },
      ],
    },
  ],
  priority: 75,
  cooldownDays: 15,
  maxOccurrences: 3,

  phaseSkeletons: [
    { role: '入宫', description: '秦王被召入宫，不知陛下意图，需要判断形势', turnRange: [1, 3] },
    { role: '对答', description: '陛下提出质问或要求，秦王必须谨慎应对', turnRange: [4, 6] },
    { role: '退朝', description: '面圣结果出来，秦王回府与幕僚商议应对', turnRange: [7, 9] },
  ],
  resolution: {
    coreConflict: '秦王能否在面圣中化解危机或争取有利地位',
    resolutionSignals: [
      '陛下做出明确裁决',
      '秦王成功为自己辩解',
      '陛下提出了新的要求或安排',
      '面圣不了了之，但关系发生了微妙变化',
    ],
    softCap: 10,
    hardCap: 13,
  },

  constraints: [
    '李渊的态度要符合皇帝威严，不可过于卑微',
    '场景中秦王只能自称"儿臣"',
    '对话需体现父子关系的复杂性',
  ],
  possibleLocations: ['两仪殿', '甘露殿', '太极宫·御书房'],
  requiredRoles: ['皇帝（李渊）', '秦王', '谋士（事后商议）'],

  baseOutcomeEffects: [
    { axisId: 'imperial_suspicion', delta: -5, reason: '面圣后暂时释疑', source: 'event' },
    { axisId: 'succession_crisis', delta: 3, reason: '召见本身就是局势紧张的信号', source: 'event' },
  ],
};
