import type { EventSkeleton } from '../../types/world';

/** 政治对抗：朝堂弹劾、舆论攻击、政治打压 */
export const politicalConfrontation: EventSkeleton = {
  id: 'skeleton_political_confrontation',
  category: '政治对抗',
  description: '敌对方在朝堂上对秦王发起政治攻击',

  preconditions: [
    { type: 'pressure_above', params: { axisId: 'court_opinion', value: 50 } },
  ],
  pressureTriggers: [
    {
      axes: [
        { axisId: 'court_opinion', weight: 1.0, threshold: 60 },
        { axisId: 'jiancheng_hostility', weight: 0.5, threshold: 45 },
      ],
    },
  ],
  priority: 60,
  cooldownDays: 10,
  maxOccurrences: 3,

  phaseSkeletons: [
    { role: '风声', description: '秦王得到消息或亲历朝堂上的政治攻击', turnRange: [1, 3] },
    { role: '对峙', description: '围绕政治指控/朝堂舆论，秦王必须选择如何回应', turnRange: [4, 6] },
    { role: '结盘', description: '看清这轮政治博弈的结果，决定后续应对', turnRange: [7, 9] },
  ],
  resolution: {
    coreConflict: '秦王能否化解这轮政治攻击',
    resolutionSignals: [
      { outcome: 'success', description: '攻击被成功反驳或化解，朝堂局势缓和' },
      { outcome: 'partial', description: '陛下介入平息争端，双方暂时休战' },
      { outcome: 'failure', description: '秦王被迫做出妥协，雍州牧之位被夺' },
      { outcome: 'disaster', description: '反将一军失利，陛下震怒，秦王进一步被孤立' },
    ],
    softCap: 10,
    hardCap: 13,
  },

  constraints: [
    '攻击必须有具体的政治指控内容',
    '朝堂场景需有其他朝臣旁观反应',
    '幕后推手的身份应能被推断出来',
  ],
  possibleLocations: ['太极宫·朝堂', '两仪殿', '东宫·密室'],
  requiredRoles: ['发起者', '秦王（被攻击方）', '谋士（出谋划策）'],

  baseOutcomeEffects: [
    {
      id: 'pol_success_court',
      tag: 'success',
      kind: 'pressure',
      modifier: { axisId: 'court_opinion', delta: -10, reason: '反驳成功舆论缓和', source: 'event' },
    },
    {
      id: 'pol_partial_suspicion',
      tag: 'partial',
      kind: 'pressure',
      modifier: { axisId: 'imperial_suspicion', delta: 5, reason: '陛下注意到争端', source: 'event' },
    },
    {
      id: 'pol_failure_office',
      tag: 'failure',
      kind: 'loseOffice',
      officeId: 'yongzhou_mu',
      reason: '朝堂博弈失利，雍州牧被夺',
    },
    {
      id: 'pol_failure_pressure',
      tag: 'failure',
      kind: 'pressure',
      modifier: { axisId: 'imperial_suspicion', delta: 15, reason: '陛下信任受损', source: 'event' },
    },
    {
      id: 'pol_disaster_pressure',
      tag: 'disaster',
      kind: 'pressure',
      modifier: { axisId: 'imperial_suspicion', delta: 25, reason: '反将一军失利激怒陛下', source: 'event' },
    },
    {
      id: 'pol_disaster_court',
      tag: 'disaster',
      kind: 'pressure',
      modifier: { axisId: 'court_opinion', delta: 15, reason: '舆论彻底倒向东宫', source: 'event' },
    },
  ],
};
