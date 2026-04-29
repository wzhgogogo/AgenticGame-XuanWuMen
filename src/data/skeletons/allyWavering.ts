import type { EventSkeleton } from '../../types/world';

/** 盟友离心：关键人物动摇、叛离、或被拉拢 */
export const allyWavering: EventSkeleton = {
  id: 'skeleton_ally_wavering',
  category: '盟友离心',
  description: '秦王府的某个关键成员心生动摇',

  preconditions: [
    { type: 'pressure_above', params: { axisId: 'qinwangfu_desperation', value: 60 } },
  ],
  pressureTriggers: [
    {
      axes: [
        { axisId: 'qinwangfu_desperation', weight: 1.0, threshold: 65 },
        { axisId: 'jiancheng_hostility', weight: 0.3, threshold: 50 },
      ],
    },
  ],
  priority: 55,
  cooldownDays: 20,
  maxOccurrences: 2,

  phaseSkeletons: [
    { role: '疑端初现', description: '发现某关键人物行为异常、或接到其动摇的消息', turnRange: [1, 3] },
    { role: '质询', description: '秦王与该人物对话，了解真实想法', turnRange: [4, 6] },
    { role: '挽留或放手', description: '决定是否能挽回此人，以及对其他人的影响', turnRange: [7, 9] },
  ],
  resolution: {
    coreConflict: '能否稳住动摇的盟友',
    resolutionSignals: [
      { outcome: 'success', description: '盟友被说服，重新坚定' },
      { outcome: 'partial', description: '暂时稳住但裂痕已生' },
      { outcome: 'failure', description: '盟友离去或暗中叛变' },
    ],
    softCap: 10,
    hardCap: 13,
  },

  constraints: [
    '动摇者应是信任度最低或耐心最低的 NPC',
    '离心原因必须合理，不能无中生有',
    '秦王在此场景中应能表现领导力',
  ],
  possibleLocations: ['秦王府·书房', '长安城外·郊野', '秦王府·密室'],
  requiredRoles: ['动摇者', '秦王', '另一谋士（旁观或劝说）'],

  baseOutcomeEffects: [
    {
      id: 'ally_success_pressure',
      tag: 'success',
      kind: 'pressure',
      modifier: { axisId: 'qinwangfu_desperation', delta: -5, reason: '盟友重坚，府中信心回升', source: 'event' },
    },
    {
      id: 'ally_partial_pressure',
      tag: 'partial',
      kind: 'pressure',
      modifier: { axisId: 'qinwangfu_desperation', delta: 8, reason: '内部裂痕已生', source: 'event' },
    },
    {
      id: 'ally_failure_npc',
      tag: 'failure',
      kind: 'loseNpc',
      characterId: 'changsun_wuji',
      status: 'exiled',
      reason: '动摇盟友被建成奏请逐出秦王府',
    },
    {
      id: 'ally_failure_pressure',
      tag: 'failure',
      kind: 'pressure',
      modifier: { axisId: 'qinwangfu_desperation', delta: 18, reason: '关键谋士离散', source: 'event' },
    },
    {
      id: 'ally_disaster_npc',
      tag: 'disaster',
      kind: 'loseNpc',
      characterId: 'fang_xuanling',
      status: 'exiled',
      reason: '盟友彻底倒戈，投向东宫',
    },
    {
      id: 'ally_disaster_flag',
      tag: 'disaster',
      kind: 'flag',
      key: 'commitment_collapse',
      value: true,
      reason: '核心盟友叛离，府内信心崩盘',
    },
    {
      id: 'ally_disaster_pressure',
      tag: 'disaster',
      kind: 'pressure',
      modifier: { axisId: 'qinwangfu_desperation', delta: 25, reason: '盟友叛离引发连锁崩盘', source: 'event' },
    },
  ],
};
