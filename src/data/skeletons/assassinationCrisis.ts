import type { EventSkeleton } from '../../types/world';

/** 暗杀危机：物理暗杀、伏击、刺杀 */
export const assassinationCrisis: EventSkeleton = {
  id: 'skeleton_assassination_crisis',
  category: '暗杀危机',
  description: '敌对方策划直接的物理消灭——伏兵、刺客、或围杀。',

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
      '暗杀被成功挫败',
      '秦王负伤但脱险',
      '刺客被擒获',
      '暗杀制造了公开事件，无法继续隐瞒',
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
    { axisId: 'succession_crisis', delta: 15, reason: '暗杀事件令局面急剧恶化', source: 'event' },
    { axisId: 'qinwangfu_desperation', delta: 20, reason: '性命受到直接威胁', source: 'event' },
    { axisId: 'jiancheng_hostility', delta: 5, reason: '暗杀失败后敌意更浓', source: 'event' },
  ],
};
