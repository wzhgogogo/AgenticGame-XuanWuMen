import type { EventSkeleton } from '../../types/world';

/** 皇帝召见：李渊过问、调停、训斥或试探 */
export const imperialSummons: EventSkeleton = {
  id: 'skeleton_imperial_summons',
  category: '皇帝召见',
  description: '李渊单独召见秦王',

  preconditions: [],
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
      { outcome: 'success', description: '秦王成功为自己辩解，陛下暂时释疑' },
      { outcome: 'partial', description: '陛下提出新的要求或安排，但未削权' },
      { outcome: 'failure', description: '陛下下诏削去尚书令一职' },
      { outcome: 'disaster', description: '陛下命秦王出镇洛阳，名为屏藩实为流放' },
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
    {
      id: 'summons_success_suspicion',
      tag: 'success',
      kind: 'pressure',
      modifier: { axisId: 'imperial_suspicion', delta: -10, reason: '面圣后陛下释疑', source: 'event' },
    },
    {
      id: 'summons_partial_pressure',
      tag: 'partial',
      kind: 'pressure',
      modifier: { axisId: 'succession_crisis', delta: 5, reason: '召见本身就是局势紧张的信号', source: 'event' },
    },
    {
      id: 'summons_failure_office',
      tag: 'failure',
      kind: 'loseOffice',
      officeId: 'shangshu_ling',
      reason: '陛下削去尚书令',
    },
    {
      id: 'summons_failure_pressure',
      tag: 'failure',
      kind: 'pressure',
      modifier: { axisId: 'qinwangfu_desperation', delta: 15, reason: '核心要职被削', source: 'event' },
    },
    {
      id: 'summons_disaster_flag',
      tag: 'disaster',
      kind: 'flag',
      key: 'dispatch_to_luoyang',
      value: true,
      reason: '陛下命秦王出镇洛阳',
    },
    {
      id: 'summons_disaster_office',
      tag: 'disaster',
      kind: 'loseOffice',
      officeId: 'yongzhou_mu',
      reason: '出镇外地，雍州牧自然被夺',
    },
  ],
};
