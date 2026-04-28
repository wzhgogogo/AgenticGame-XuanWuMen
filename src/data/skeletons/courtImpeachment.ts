import type { EventSkeleton } from '../../types/world';

/** 朝堂构陷罢黜：建成在朝堂奏请罢免秦王府属官 / 削秦王本人官职 */
export const courtImpeachment: EventSkeleton = {
  id: 'skeleton_court_impeachment',
  category: '朝堂构陷',
  description: '太子在朝堂上奏请罢免秦王府属官、或弹劾秦王本人',

  preconditions: [
    { type: 'pressure_above', params: { axisId: 'jiancheng_hostility', value: 60 } },
    { type: 'pressure_above', params: { axisId: 'court_opinion', value: 50 } },
  ],
  pressureTriggers: [
    {
      axes: [
        { axisId: 'jiancheng_hostility', weight: 0.6, threshold: 65 },
        { axisId: 'court_opinion', weight: 0.6, threshold: 55 },
      ],
    },
  ],
  priority: 75,
  cooldownDays: 18,
  maxOccurrences: 3,

  phaseSkeletons: [
    { role: '风声', description: '消息传来——太子已联络多位朝臣，将于明日朝会发难', turnRange: [1, 3] },
    { role: '朝议', description: '朝堂上奏请罢黜，群臣观望，秦王必须当场表态', turnRange: [4, 6] },
    { role: '裁断', description: '陛下做出裁断，结果或缓或厉', turnRange: [7, 9] },
  ],
  resolution: {
    coreConflict: '秦王能否守住核心人事与官职',
    resolutionSignals: [
      { outcome: 'success', description: '秦王力辩取胜，构陷不成反而落了建成面子' },
      { outcome: 'partial', description: '陛下和稀泥，府属暂保但秦王自损一职' },
      { outcome: 'failure', description: '天策上将之位被削，秦王公开矮化' },
      { outcome: 'disaster', description: '多职被夺，秦王在朝堂上颜面尽失' },
    ],
    softCap: 10,
    hardCap: 13,
  },

  constraints: [
    '弹劾内容必须有具体罪名（结党 / 越权 / 蓄养死士 等武德年间真实政治指控）',
    '朝堂场景需有其他朝臣表态（萧瑀、陈叔达、裴寂等）',
    '陛下的裁断要符合皇帝平衡之术——少有当场严惩',
  ],
  possibleLocations: ['太极宫·朝堂', '两仪殿'],
  requiredRoles: ['弹劾发起者（建成）', '秦王（被弹劾方）', '中立朝臣', '陛下'],
  requiredNpcIds: ['li_jiancheng'],

  baseOutcomeEffects: [
    {
      id: 'imp_success_court',
      tag: 'success',
      kind: 'pressure',
      modifier: { axisId: 'court_opinion', delta: -12, reason: '反弹劾得胜，舆论缓和', source: 'event' },
    },
    {
      id: 'imp_partial_office',
      tag: 'partial',
      kind: 'loseOffice',
      officeId: 'sikong',
      reason: '陛下平衡之术，秦王自损司空一职',
    },
    {
      id: 'imp_failure_office',
      tag: 'failure',
      kind: 'loseOffice',
      officeId: 'tiance_shangjiang',
      reason: '天策上将之位被削',
    },
    {
      id: 'imp_failure_pressure',
      tag: 'failure',
      kind: 'pressure',
      modifier: { axisId: 'court_opinion', delta: 15, reason: '舆论倒向东宫', source: 'event' },
    },
    {
      id: 'imp_disaster_office_a',
      tag: 'disaster',
      kind: 'loseOffice',
      officeId: 'shangshu_ling',
      reason: '尚书令被夺',
    },
    {
      id: 'imp_disaster_office_b',
      tag: 'disaster',
      kind: 'loseOffice',
      officeId: 'yongzhou_mu',
      reason: '雍州牧亦被夺',
    },
    {
      id: 'imp_disaster_flag',
      tag: 'disaster',
      kind: 'flag',
      key: 'impeached_severely',
      value: true,
      reason: '被严重弹劾',
    },
  ],
};
