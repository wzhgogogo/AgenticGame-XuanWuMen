import type { EventSkeleton } from '../../types/world';

/** 部下逼宫：己方人心涣散或关键人物逼迫决断 */
export const subordinateUltimatum: EventSkeleton = {
  id: 'skeleton_subordinate_ultimatum',
  category: '部下逼宫',
  description: '秦王府核心成员因长期压力和主公犹豫，当面逼迫秦王做出决断。',

  preconditions: [
    { type: 'pressure_above', params: { axisId: 'qinwangfu_desperation', value: 70 } },
    { type: 'npc_patience_below', params: { characterId: 'weichi_jingde', value: 20 } },
  ],
  pressureTriggers: [
    {
      axes: [
        { axisId: 'qinwangfu_desperation', weight: 1.0, threshold: 75 },
        { axisId: 'succession_crisis', weight: 0.5, threshold: 60 },
      ],
    },
  ],
  priority: 90,
  cooldownDays: 30,
  maxOccurrences: 1,

  phaseSkeletons: [
    { role: '摊牌', description: '关键部下闯入求见，态度激烈，开门见山', turnRange: [1, 3] },
    { role: '对质', description: '部下列举理由、甚至以去留相逼，秦王必须回应', turnRange: [4, 6] },
    { role: '抉择', description: '秦王做出决定——动手、安抚、或尝试妥协', turnRange: [7, 9] },
  ],
  resolution: {
    coreConflict: '秦王是否被部下说服采取行动',
    resolutionSignals: [
      { outcome: 'success', description: '秦王明确表态要行动，部下重燃信心' },
      { outcome: 'partial', description: '秦王成功安抚部下暂时隐忍，达成折中方案' },
      { outcome: 'failure', description: '部下失望离去，敬德愤而出走' },
      { outcome: 'disaster', description: '逼宫失败导致府中信心彻底崩盘' },
    ],
    softCap: 10,
    hardCap: 13,
  },

  constraints: [
    '逼宫者必须是耐心最低的 NPC',
    '语言和态度要符合该 NPC 的性格',
    '不可出现部下对主公不敬到违反君臣之礼的程度',
  ],
  possibleLocations: ['秦王府·书房', '秦王府·密室', '秦王府·后花园'],
  requiredRoles: ['逼宫者', '秦王', '在场谋士（劝和或助攻）'],

  baseOutcomeEffects: [
    {
      id: 'ult_success_pressure',
      tag: 'success',
      kind: 'pressure',
      modifier: { axisId: 'qinwangfu_desperation', delta: -5, reason: '主公定调，府中士气回升', source: 'event' },
    },
    {
      id: 'ult_success_military',
      tag: 'success',
      kind: 'pressure',
      modifier: { axisId: 'military_readiness', delta: 8, reason: '决意行动，备战加紧', source: 'event' },
    },
    {
      id: 'ult_partial_pressure',
      tag: 'partial',
      kind: 'pressure',
      modifier: { axisId: 'qinwangfu_desperation', delta: 10, reason: '内部压力公开化', source: 'event' },
    },
    {
      id: 'ult_failure_npc',
      tag: 'failure',
      kind: 'loseNpc',
      characterId: 'weichi_jingde',
      status: 'exiled',
      reason: '敬德愤而出走，半年不归',
    },
    {
      id: 'ult_failure_pressure',
      tag: 'failure',
      kind: 'pressure',
      modifier: { axisId: 'qinwangfu_desperation', delta: 25, reason: '核心武将出走，府中震动', source: 'event' },
    },
    {
      id: 'ult_disaster_flag',
      tag: 'disaster',
      kind: 'flag',
      key: 'commitment_collapse',
      value: true,
      reason: '府中信心彻底崩盘',
    },
  ],
};
