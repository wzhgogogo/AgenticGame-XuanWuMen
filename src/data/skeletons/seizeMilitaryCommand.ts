import type { EventSkeleton } from '../../types/world';

/** 夺兵权请缨：突厥犯边时元吉奏请代秦王北征——史实上玄武门前夕最关键的"倒数计时"事件 */
export const seizeMilitaryCommand: EventSkeleton = {
  id: 'skeleton_seize_military_command',
  category: '夺兵权',
  description: '突厥犯边，元吉奏请代秦王北征，欲调走秦王府精兵',

  preconditions: [
    { type: 'flag', params: { key: 'tujue_invasion', value: true } },
    { type: 'pressure_above', params: { axisId: 'yuanji_ambition', value: 60 } },
  ],
  pressureTriggers: [
    {
      axes: [
        { axisId: 'yuanji_ambition', weight: 1.0, threshold: 65 },
      ],
    },
  ],
  priority: 80,
  cooldownDays: 30,
  maxOccurrences: 1,

  phaseSkeletons: [
    { role: '边报', description: '突厥犯边的军报到京，朝堂震动', turnRange: [1, 3] },
    { role: '请缨', description: '元吉在朝会奏请代北征，并请调秦王府精兵程知节、尉迟敬德等', turnRange: [4, 6] },
    { role: '应对', description: '秦王必须当朝抗辩或私下运作，否则当夜即下兵符', turnRange: [7, 9] },
  ],
  resolution: {
    coreConflict: '能否阻止秦王府精兵被调走',
    resolutionSignals: [
      { outcome: 'success', description: '秦王自请代征获准，军权反握得更紧' },
      { outcome: 'partial', description: '陛下折中，元吉率部分军队但秦王精兵未被调' },
      { outcome: 'failure', description: '兵符已下，秦王府精兵被夺，备战受重创' },
      { outcome: 'disaster', description: '不仅兵权被夺，连左武卫大将军之衔也被削' },
    ],
    softCap: 10,
    hardCap: 13,
  },

  constraints: [
    '元吉奏请的措辞必须有政治体面（御外侮 / 兄弟分忧）',
    '调走的精兵需点名——尉迟敬德、程知节、秦琼等',
    '陛下的态度需体现"挑动诸子相争"的帝王心术',
    '场景如果走 disaster 路线，意味着李世民军事路线基本断绝',
  ],
  possibleLocations: ['太极宫·朝堂', '两仪殿', '秦王府·书房'],
  requiredRoles: ['元吉（奏请者）', '秦王（被剥夺方）', '陛下', '武将（被点名调走）'],
  requiredNpcIds: ['li_yuanji'],

  baseOutcomeEffects: [
    {
      id: 'mil_seize_success_pressure',
      tag: 'success',
      kind: 'pressure',
      modifier: { axisId: 'military_readiness', delta: 12, reason: '反占主动，军权稳固', source: 'event' },
    },
    {
      id: 'mil_seize_success_yuanji',
      tag: 'success',
      kind: 'pressure',
      modifier: { axisId: 'yuanji_ambition', delta: 10, reason: '元吉夺兵失败更恼怒', source: 'event' },
    },
    {
      id: 'mil_seize_partial_pressure',
      tag: 'partial',
      kind: 'pressure',
      modifier: { axisId: 'imperial_suspicion', delta: 8, reason: '陛下折中已是预警', source: 'event' },
    },
    {
      id: 'mil_seize_failure_confiscate',
      tag: 'failure',
      kind: 'confiscateMilitary',
      ceilingDelta: -30,
      reason: '秦王府精兵被夺，可用兵力上限大降',
    },
    {
      id: 'mil_seize_failure_flag',
      tag: 'failure',
      kind: 'flag',
      key: 'military_stripped',
      value: true,
      reason: '兵权被夺',
    },
    {
      id: 'mil_seize_failure_pressure',
      tag: 'failure',
      kind: 'pressure',
      modifier: { axisId: 'qinwangfu_desperation', delta: 25, reason: '失兵权后府中惶恐', source: 'event' },
    },
    {
      id: 'mil_seize_disaster_office',
      tag: 'disaster',
      kind: 'loseOffice',
      officeId: 'zuo_wuwei_dajiangjun',
      reason: '左武卫大将军之衔亦被削',
    },
    {
      id: 'mil_seize_disaster_confiscate',
      tag: 'disaster',
      kind: 'confiscateMilitary',
      ceilingDelta: -45,
      reason: '兵权与官衔双失，备战崩盘',
    },
    {
      id: 'mil_seize_disaster_flag',
      tag: 'disaster',
      kind: 'flag',
      key: 'military_stripped',
      value: true,
      reason: '兵权被夺',
    },
  ],
};
