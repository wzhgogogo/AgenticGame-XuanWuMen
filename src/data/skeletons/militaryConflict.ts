import type { EventSkeleton } from '../../types/world';

/** 军事冲突：兵权争夺、军队调动、公开武力对抗 */
export const militaryConflict: EventSkeleton = {
  id: 'skeleton_military_conflict',
  category: '军事冲突',
  description: '局势发展到公开武力阶段—',

  preconditions: [
    { type: 'pressure_above', params: { axisId: 'military_readiness', value: 40 } },
    { type: 'pressure_above', params: { axisId: 'succession_crisis', value: 80 } },
    { type: 'day_range', params: { minDay: 60, maxDay: 180 } },
  ],
  pressureTriggers: [
    {
      axes: [
        { axisId: 'succession_crisis', weight: 1.0, threshold: 85 },
        { axisId: 'military_readiness', weight: 0.8, threshold: 55 },
      ],
    },
  ],
  priority: 95,
  cooldownDays: 0,
  maxOccurrences: 1,

  phaseSkeletons: [
    { role: '战前', description: '最后的部署和准备，确认计划和人手', turnRange: [1, 4] },
    { role: '交锋', description: '军事行动展开，局面瞬息万变', turnRange: [5, 8] },
    { role: '定局', description: '冲突结果确定，胜负分晓', turnRange: [9, 12] },
  ],
  resolution: {
    coreConflict: '这场武力冲突的胜负和代价',
    resolutionSignals: [
      '一方取得明确军事胜利',
      '对方投降或被俘',
      '双方妥协停战',
      '第三方力量介入终止冲突',
    ],
    softCap: 13,
    hardCap: 16,
  },

  constraints: [
    '军事行动必须有明确的战术逻辑',
    '伤亡和结果要符合双方兵力对比',
    '这是最高级别事件，通常意味着游戏高潮',
  ],
  possibleLocations: ['玄武门', '太极宫·北门', '长安城内'],
  requiredRoles: ['指挥者', '武将（执行者）', '谋士（参谋）'],

  baseOutcomeEffects: [
    { axisId: 'succession_crisis', delta: 30, reason: '公开武力对抗彻底改变格局', source: 'event' },
  ],
};
