import type { EventSkeleton } from '../../types/world';

/** 情报事件：密报传来、截获书信、泄密、间谍暴露 */
export const intelligenceEvent: EventSkeleton = {
  id: 'skeleton_intelligence_event',
  category: '情报事件',
  description: '秦王府收到重要情报',

  preconditions: [
    { type: 'day_range', params: { minDay: 2, maxDay: 180 } },
  ],
  pressureTriggers: [
    {
      axes: [
        { axisId: 'succession_crisis', weight: 1.0, threshold: 45 },
      ],
    },
  ],
  priority: 40,
  cooldownDays: 8,
  maxOccurrences: 5,

  phaseSkeletons: [
    { role: '消息传来', description: '情报抵达——密信、逃回的探子、或宫中内应传话', turnRange: [1, 3] },
    { role: '分析研判', description: '幕僚分析情报真伪和含义，讨论应对方案', turnRange: [4, 6] },
    { role: '决策', description: '根据情报做出行动决定', turnRange: [7, 8] },
  ],
  resolution: {
    coreConflict: '如何利用或应对这条情报',
    resolutionSignals: [
      { outcome: 'success', description: '正确判断情报真伪，做出有利决策' },
      { outcome: 'partial', description: '判断不明，暂时观望' },
      { outcome: 'failure', description: '依据假情报行动，造成战备损耗' },
    ],
    softCap: 9,
    hardCap: 12,
  },

  constraints: [
    '情报内容必须与当前压力最高的轴相关',
    '可以是有利情报也可以是坏消息',
    '情报来源要有合理解释',
  ],
  possibleLocations: ['秦王府·书房', '秦王府·密室'],
  requiredRoles: ['送信者/报告者', '秦王', '谋士（分析研判）'],

  baseOutcomeEffects: [
    {
      id: 'intel_success_military',
      tag: 'success',
      kind: 'pressure',
      modifier: { axisId: 'military_readiness', delta: 5, reason: '情报有助于备战', source: 'event' },
    },
    {
      id: 'intel_partial_neutral',
      tag: 'partial',
      kind: 'pressure',
      modifier: { axisId: 'qinwangfu_desperation', delta: 3, reason: '情报模糊增加焦虑', source: 'event' },
    },
    {
      id: 'intel_failure_flag',
      tag: 'failure',
      kind: 'flag',
      key: 'false_intel_acted_on',
      value: true,
      reason: '依据假情报行动',
    },
    {
      id: 'intel_failure_military',
      tag: 'failure',
      kind: 'pressure',
      modifier: { axisId: 'military_readiness', delta: -10, reason: '假情报误导战备', source: 'event' },
    },
  ],
};
