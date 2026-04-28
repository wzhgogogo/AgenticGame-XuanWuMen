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
      { outcome: 'success', description: '秦王成功离开宴席，无重大损伤' },
      { outcome: 'partial', description: '冲突当场爆发但勉强脱身，敌意公开化' },
      { outcome: 'failure', description: '随行武将护主重伤，宴局以血光收场' },
      { outcome: 'disaster', description: '秦王中毒重伤，敬德拼死救出' },
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
    {
      id: 'banquet_success_pressure',
      tag: 'success',
      kind: 'pressure',
      modifier: { axisId: 'qinwangfu_desperation', delta: 8, reason: '宴局加剧紧迫', source: 'event' },
    },
    {
      id: 'banquet_partial_flag',
      tag: 'partial',
      kind: 'flag',
      key: 'shimin_injured',
      value: true,
      reason: '中毒但勉强逃离',
    },
    {
      id: 'banquet_partial_pressure',
      tag: 'partial',
      kind: 'pressure',
      modifier: { axisId: 'qinwangfu_desperation', delta: 10, reason: '秦王中毒逃归，府中惶恐', source: 'event' },
    },
    {
      id: 'banquet_failure_npc',
      tag: 'failure',
      kind: 'loseNpc',
      characterId: 'weichi_jingde',
      status: 'deceased',
      reason: '宴局中护主战死',
    },
    {
      id: 'banquet_failure_flag',
      tag: 'failure',
      kind: 'flag',
      key: 'shimin_injured',
      value: true,
      reason: '秦王中毒受伤',
    },
    {
      id: 'banquet_failure_pressure',
      tag: 'failure',
      kind: 'pressure',
      modifier: { axisId: 'qinwangfu_desperation', delta: 20, reason: '护主战死+秦王中毒，府中震动', source: 'event' },
    },
    {
      id: 'banquet_disaster_flag',
      tag: 'disaster',
      kind: 'flag',
      key: 'player_captured',
      value: true,
      reason: '秦王中毒昏迷被控制',
    },
    {
      id: 'banquet_disaster_pressure',
      tag: 'disaster',
      kind: 'pressure',
      modifier: { axisId: 'succession_crisis', delta: 25, reason: '秦王被擒，格局剧变', source: 'event' },
    },
  ],
};
