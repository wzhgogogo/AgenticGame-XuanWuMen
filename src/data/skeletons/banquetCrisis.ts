import type { EventSkeleton } from '../../types/world';

/** 宴会危局：社交场合暗藏杀机 */
export const banquetCrisis: EventSkeleton = {
  id: 'skeleton_banquet_crisis',
  category: '宴会危局',
  description: '敌对方设宴款待秦王',

  preconditions: [
    { type: 'pressure_above', params: { axisId: 'jiancheng_hostility', value: 65 } },
  ],
  pressureTriggers: [
    {
      axes: [
        { axisId: 'jiancheng_hostility', weight: 1.0, threshold: 70 },
        { axisId: 'succession_crisis', weight: 0.5, threshold: 50 },
      ],
    },
  ],
  priority: 70,
  cooldownDays: 15,
  maxOccurrences: 2,

  phaseSkeletons: [
    { role: '入局', description: '秦王赴宴，尚未察觉异常，NPC 随行护卫或出席', turnRange: [1, 3] },
    { role: '危机浮现', description: '杀机显露——毒酒、伏兵、或言语逼迫，秦王必须应对', turnRange: [4, 6] },
    { role: '脱身或对抗', description: '秦王设法安全离开，或冲突升级到不可收拾', turnRange: [7, 9] },
  ],
  resolution: {
    coreConflict: '秦王能否安全脱离宴局',
    resolutionSignals: [
      '秦王成功离开宴席',
      '冲突当场爆发、武力对抗',
      '设局者主动收手，暂时隐忍',
      '第三方介入打断宴局',
    ],
    softCap: 10,
    hardCap: 13,
  },

  constraints: [
    '设局者必须是建成或元吉（取决于谁的压力更高）',
    '秦王一方必须有至少一名武将随行',
    '场景不可出现穿越或不合时代的元素',
  ],
  possibleLocations: ['东宫·宴厅', '齐王府·正堂', '太极宫·御花园'],
  requiredRoles: ['设局者', '秦王（目标）', '随行护卫', '旁观皇族'],

  baseOutcomeEffects: [
    { axisId: 'succession_crisis', delta: 10, reason: '宴局事件加剧矛盾', source: 'event' },
    { axisId: 'qinwangfu_desperation', delta: 12, reason: '遇险后秦王府更加紧迫', source: 'event' },
  ],
};
