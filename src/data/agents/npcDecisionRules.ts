import type { NpcDecisionRule } from '../../types/world';

// ===== 长孙无忌：谨慎谋士 =====
// 特征：耐心高，不会直接逼迫，偏好政治手段和情报收集
// 只有局势非常严峻时才会转向激进

export const changSunWujiRules: NpcDecisionRule[] = [
  // 日常：收集情报、游说中立派
  {
    conditions: { daysSinceLastActionAbove: 2 },
    enabledActions: ['gather_intel', 'lobby'],
    basePressureEffects: [],
  },
  // 局势紧张时：暗中谋划、联络盟友
  {
    conditions: {
      pressureAbove: { succession_crisis: 60 },
    },
    enabledActions: ['scheme', 'seek_allies'],
    basePressureEffects: [
      { axisId: 'military_readiness', delta: 1, reason: '无忌暗中布局', source: 'changsun_wuji' },
    ],
  },
  // 急迫到极点：向玩家施压（但措辞温和）
  {
    conditions: {
      patienceBelow: 30,
      pressureAbove: { qinwangfu_desperation: 70 },
    },
    enabledActions: ['pressure_player'],
    basePressureEffects: [
      { axisId: 'qinwangfu_desperation', delta: 3, reason: '无忌谏言催促', source: 'changsun_wuji' },
    ],
  },
];

// ===== 尉迟敬德：暴烈武将 =====
// 特征：耐心低、衰减快，偏好直接对抗
// 极端情况下会直接逼宫或出走

export const weiChiJingDeRules: NpcDecisionRule[] = [
  // 日常：等待，但越来越不耐烦
  {
    conditions: { patienceAbove: 60 },
    enabledActions: ['wait'],
    basePressureEffects: [],
  },
  // 有些焦躁：练兵、提升军事准备
  {
    conditions: {
      patienceBelow: 60,
      patienceAbove: 30,
    },
    enabledActions: ['gather_intel'],
    basePressureEffects: [
      { axisId: 'military_readiness', delta: 2, reason: '敬德加紧练兵', source: 'weichi_jingde' },
    ],
  },
  // 非常焦躁：向玩家施压
  {
    conditions: {
      patienceBelow: 30,
      pressureAbove: { qinwangfu_desperation: 50 },
    },
    enabledActions: ['pressure_player', 'confront'],
    basePressureEffects: [
      { axisId: 'qinwangfu_desperation', delta: 5, reason: '敬德急躁催促', source: 'weichi_jingde' },
    ],
  },
  // 最后通牒：耐心耗尽
  {
    conditions: {
      patienceBelow: 15,
      pressureAbove: { qinwangfu_desperation: 75 },
    },
    enabledActions: ['confront'],
    basePressureEffects: [
      { axisId: 'qinwangfu_desperation', delta: 20, reason: '敬德最后通牒', source: 'weichi_jingde' },
    ],
    triggerEvent: 'skeleton_subordinate_ultimatum',
  },
];

// ===== 房玄龄：稳健谋士 =====
// 特征：耐心最高，擅长谋划和情报分析
// 偏好慢工出细活，很少直接施压

export const fangXuanLingRules: NpcDecisionRule[] = [
  // 日常：收集情报、分析局势
  {
    conditions: { daysSinceLastActionAbove: 3 },
    enabledActions: ['gather_intel', 'scheme'],
    basePressureEffects: [],
  },
  // 有规划地推进
  {
    conditions: {
      pressureAbove: { succession_crisis: 55 },
    },
    enabledActions: ['scheme', 'seek_allies'],
    basePressureEffects: [
      { axisId: 'military_readiness', delta: 1, reason: '玄龄谋划部署', source: 'fang_xuanling' },
    ],
  },
  // 关键时刻：联合无忌一起施压
  {
    conditions: {
      patienceBelow: 25,
      pressureAbove: { qinwangfu_desperation: 65 },
    },
    enabledActions: ['pressure_player', 'lobby'],
    basePressureEffects: [
      { axisId: 'qinwangfu_desperation', delta: 3, reason: '玄龄联合谏言', source: 'fang_xuanling' },
    ],
  },
];

// ===== NPC 耐心衰减速率 =====

export const NPC_PATIENCE_DECAY: Record<string, number> = {
  changsun_wuji: 0.5,     // 非常有耐心
  weichi_jingde: 2.0,     // 急躁
  fang_xuanling: 0.3,     // 最有耐心
};

// ===== 汇总 =====

export const NPC_DECISION_RULES: Record<string, NpcDecisionRule[]> = {
  changsun_wuji: changSunWujiRules,
  weichi_jingde: weiChiJingDeRules,
  fang_xuanling: fangXuanLingRules,
};
