import type { EventSkeleton } from '../../types/world';

/** 朝堂主动反击：被严重弹劾后秦王府密议反扑——这是 F1 政治终局的"主动失败"路径 */
export const courtCounterstrike: EventSkeleton = {
  id: 'skeleton_court_counterstrike',
  category: '朝堂反击',
  description: '秦王府密议——是否抓住建成把柄主动弹劾，还是借外援入京制衡',

  preconditions: [
    { type: 'flag', params: { key: 'impeached_severely', value: true } },
    { type: 'pressure_above', params: { axisId: 'qinwangfu_desperation', value: 55 } },
  ],
  pressureTriggers: [
    {
      axes: [
        { axisId: 'qinwangfu_desperation', weight: 1.0, threshold: 60 },
      ],
    },
  ],
  priority: 70,
  cooldownDays: 25,
  maxOccurrences: 1,

  phaseSkeletons: [
    { role: '密议', description: '玄龄/无忌在书房铺开棋局，提出三种反击路线——朝堂正面 / 外援入京 / 借后宫之口', turnRange: [1, 3] },
    { role: '出招', description: '秦王选定路线后，反击展开——但反击同样是把柄', turnRange: [4, 6] },
    { role: '验局', description: '反击结果出来，或反败为胜，或反受其害', turnRange: [7, 9] },
  ],
  resolution: {
    coreConflict: '反击能否扭转被动局面',
    resolutionSignals: [
      { outcome: 'success', description: '反击得手，建成元气受损，朝堂局势倒转' },
      { outcome: 'partial', description: '反击未尽全功但稳住局面，陛下叹其能干' },
      { outcome: 'failure', description: '反击被识破反成把柄，秦王进一步遭嫉' },
      { outcome: 'disaster', description: '反击被反将一军，密议参与者被构陷下狱' },
    ],
    softCap: 10,
    hardCap: 13,
  },

  constraints: [
    '密议路线必须三种里选一——正面弹劾 / 外援入京 / 借后宫',
    '反击的失败应有具体把柄（私通外镇、买通宫女、伪证）',
    '场景必须有谋士主导而非秦王单干——这是文官的事',
  ],
  possibleLocations: ['秦王府·书房', '秦王府·密室'],
  requiredRoles: ['秦王', '主谋（玄龄/无忌）', '副谋'],

  baseOutcomeEffects: [
    {
      id: 'cnt_success_jiancheng_injure',
      tag: 'success',
      kind: 'injureNpc',
      characterId: 'li_jiancheng',
      commitmentDelta: -20,
      reason: '反击削弱建成执行力',
    },
    {
      id: 'cnt_success_pressure',
      tag: 'success',
      kind: 'pressure',
      modifier: { axisId: 'jiancheng_hostility', delta: 12, reason: '建成虽损但更恨秦王', source: 'event' },
    },
    {
      id: 'cnt_success_flag',
      tag: 'success',
      kind: 'flag',
      key: 'counterstrike_succeeded',
      value: true,
      reason: '反击得手',
    },
    {
      id: 'cnt_partial_pressure',
      tag: 'partial',
      kind: 'pressure',
      modifier: { axisId: 'court_opinion', delta: -5, reason: '反击虽未尽功但稳住局面', source: 'event' },
    },
    {
      id: 'cnt_failure_pressure',
      tag: 'failure',
      kind: 'pressure',
      modifier: { axisId: 'imperial_suspicion', delta: 25, reason: '反击被识破反受陛下责难', source: 'event' },
    },
    {
      id: 'cnt_failure_flag',
      tag: 'failure',
      kind: 'flag',
      key: 'counterstrike_failed',
      value: true,
      reason: '反击败露',
    },
    {
      id: 'cnt_disaster_npc',
      tag: 'disaster',
      kind: 'loseNpc',
      characterId: 'fang_xuanling',
      status: 'imprisoned',
      reason: '密议参与者被构陷下狱',
    },
    {
      id: 'cnt_disaster_pressure',
      tag: 'disaster',
      kind: 'pressure',
      modifier: { axisId: 'imperial_suspicion', delta: 35, reason: '反击溃败，陛下震怒', source: 'event' },
    },
  ],
};
