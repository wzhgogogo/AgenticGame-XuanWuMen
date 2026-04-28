import type { EventSkeleton } from '../../types/world';

/** 军事冲突：兵权争夺、军队调动、公开武力对抗——这是终局事件，按 chosenOutcome 直接对应 E1/E3/F5 */
export const militaryConflict: EventSkeleton = {
  id: 'skeleton_military_conflict',
  category: '军事冲突',
  description: '局势发展到公开武力阶段——玄武门式摊牌',

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
      { outcome: 'success', description: '玄武门一击得手，建成元吉殒命，秦王全胜' },
      { outcome: 'partial', description: '武力胜利但代价沉重，核心臂膀战死' },
      { outcome: 'failure', description: '伏击被识破或兵力不足，秦王及亲信尽被擒' },
      { outcome: 'disaster', description: '彻底败亡，秦王战死或自尽' },
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
    {
      id: 'mil_success_pressure',
      tag: 'success',
      kind: 'pressure',
      modifier: { axisId: 'succession_crisis', delta: 30, reason: '武力一击决出胜负', source: 'event' },
    },
    {
      id: 'mil_partial_npc',
      tag: 'partial',
      kind: 'loseNpc',
      characterId: 'changsun_wuji',
      status: 'deceased',
      reason: '玄武门激战中战死',
    },
    {
      id: 'mil_partial_pressure',
      tag: 'partial',
      kind: 'pressure',
      modifier: { axisId: 'succession_crisis', delta: 40, reason: '惨烈胜利', source: 'event' },
    },
    {
      id: 'mil_failure_npc',
      tag: 'failure',
      kind: 'loseNpc',
      characterId: 'weichi_jingde',
      status: 'deceased',
      reason: '主将阵亡',
    },
    {
      id: 'mil_failure_confiscate',
      tag: 'failure',
      kind: 'confiscateMilitary',
      ceilingDelta: -30,
      reason: '战败兵力大损',
    },
    {
      id: 'mil_failure_pressure',
      tag: 'failure',
      kind: 'pressure',
      modifier: { axisId: 'imperial_suspicion', delta: 50, reason: '秦王被识破伏击', source: 'event' },
    },
    {
      id: 'mil_disaster_flag',
      tag: 'disaster',
      kind: 'flag',
      key: 'player_captured',
      value: true,
      reason: '全面溃败，秦王被擒',
    },
    {
      id: 'mil_disaster_npc',
      tag: 'disaster',
      kind: 'loseNpc',
      characterId: 'weichi_jingde',
      status: 'deceased',
      reason: '主将力战身亡',
    },
    {
      id: 'mil_disaster_confiscate',
      tag: 'disaster',
      kind: 'confiscateMilitary',
      ceilingDelta: -40,
      reason: '全军覆没',
    },
  ],
};
