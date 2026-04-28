import type { EventSkeleton } from '../../types/world';

/** 暗杀危机：物理暗杀、伏击、刺杀 */
export const assassinationCrisis: EventSkeleton = {
  id: 'skeleton_assassination_crisis',
  category: '暗杀危机',
  description: '敌对方策划直接的刺杀行动',

  preconditions: [
    { type: 'pressure_above', params: { axisId: 'jiancheng_hostility', value: 75 } },
    { type: 'pressure_above', params: { axisId: 'yuanji_ambition', value: 60 } },
  ],
  pressureTriggers: [
    {
      axes: [
        { axisId: 'jiancheng_hostility', weight: 1.0, threshold: 80 },
        { axisId: 'yuanji_ambition', weight: 0.8, threshold: 65 },
      ],
    },
  ],
  priority: 85,
  cooldownDays: 20,
  maxOccurrences: 2,

  phaseSkeletons: [
    { role: '预警', description: '秦王收到密报或偶然发现暗杀迹象', turnRange: [1, 3] },
    { role: '险境', description: '暗杀行动发动，秦王陷入危险', turnRange: [4, 7] },
    { role: '死里逃生', description: '化解危机或付出代价脱险', turnRange: [8, 10] },
  ],
  resolution: {
    coreConflict: '秦王能否在暗杀中存活并查明幕后主使',
    resolutionSignals: [
      { outcome: 'success', description: '暗杀被成功挫败，刺客被擒获' },
      { outcome: 'partial', description: '秦王负伤但脱险，刺客逃逸' },
      { outcome: 'failure', description: '秦王重伤养病，护卫战死一名' },
      { outcome: 'disaster', description: '护卫战死，秦王幸存却信心崩盘' },
    ],
    softCap: 11,
    hardCap: 14,
  },

  constraints: [
    '暗杀手段必须符合历史可信度',
    '必须有一个武将角色参与护卫',
    '暗杀的幕后策划者应该是建成或元吉',
  ],
  possibleLocations: ['长安街道', '猎场', '秦王府外', '昆明池畔'],
  requiredRoles: ['策划者', '执行者（刺客/伏兵）', '秦王（目标）', '护卫'],

  baseOutcomeEffects: [
    {
      id: 'assa_success_pressure',
      tag: 'success',
      kind: 'pressure',
      modifier: { axisId: 'qinwangfu_desperation', delta: 15, reason: '挫败暗杀但险象环生', source: 'event' },
    },
    {
      id: 'assa_success_hostility',
      tag: 'success',
      kind: 'pressure',
      modifier: { axisId: 'jiancheng_hostility', delta: 5, reason: '暗杀失败后建成更恼怒', source: 'event' },
    },
    {
      id: 'assa_partial_injure',
      tag: 'partial',
      kind: 'flag',
      key: 'shimin_injured',
      value: true,
      reason: '秦王箭伤未致命',
    },
    {
      id: 'assa_failure_npc',
      tag: 'failure',
      kind: 'loseNpc',
      characterId: 'weichi_jingde',
      status: 'deceased',
      reason: '暗杀中护主战死',
    },
    {
      id: 'assa_failure_pressure',
      tag: 'failure',
      kind: 'pressure',
      modifier: { axisId: 'qinwangfu_desperation', delta: 30, reason: '核心武将战死，府中震动', source: 'event' },
    },
    {
      id: 'assa_disaster_flag',
      tag: 'disaster',
      kind: 'flag',
      key: 'player_captured',
      value: true,
      reason: '伏击成功，秦王被擒',
    },
    {
      id: 'assa_disaster_npc',
      tag: 'disaster',
      kind: 'loseNpc',
      characterId: 'changsun_wuji',
      status: 'imprisoned',
      reason: '随秦王一并被擒',
    },
    {
      id: 'assa_disaster_pressure',
      tag: 'disaster',
      kind: 'pressure',
      modifier: { axisId: 'qinwangfu_desperation', delta: 30, reason: '秦王被擒，府中大乱', source: 'event' },
    },
  ],
};
