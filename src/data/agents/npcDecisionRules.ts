import type { NpcDecisionRule, NpcImpactProfile } from '../../types/world';

// ===== 每 NPC 压力影响白名单 =====
// LLM 提议的 pressureDelta 只在白名单内被采纳，超出即丢弃该条（不是整个 intent）
export const NPC_IMPACT_PROFILES: Record<string, NpcImpactProfile> = {
  changsun_wuji: {
    whitelist: ['court_opinion', 'succession_crisis', 'jiancheng_hostility'],
  },
  weichi_jingde: {
    whitelist: ['military_readiness', 'qinwangfu_desperation', 'imperial_suspicion', 'jiancheng_hostility'],
  },
  fang_xuanling: {
    whitelist: ['succession_crisis', 'qinwangfu_desperation', 'court_opinion'],
  },
};

// ===== 长孙无忌：谨慎谋士 =====
// 特征：耐心高，不会直接逼迫，偏好政治手段和情报收集
export const changSunWujiRules: NpcDecisionRule[] = [
  // 日常：观望 / 情报 / 温和进言
  {
    id: 'csw_daily',
    conditions: {},
    allowedStances: ['observe', 'intel', 'persuade'],
  },
  // 局势紧张：加入谋划和联络
  {
    id: 'csw_tense',
    conditions: { pressureAbove: { succession_crisis: 55 } },
    allowedStances: ['intel', 'persuade', 'scheme'],
    escalationHint: '储位已明紧张，须有所筹谋',
  },
  // 府中急迫：加入对抗
  {
    id: 'csw_urgent',
    conditions: {
      patienceBelow: 40,
      pressureAbove: { qinwangfu_desperation: 60 },
    },
    allowedStances: ['persuade', 'scheme', 'confront'],
    escalationHint: '府中众心已动，须催秦王决断',
  },
  // 破局：私通或出走（一生一次）
  {
    id: 'csw_abandon',
    conditions: {
      patienceBelow: 10,
      pressureAbove: { qinwangfu_desperation: 80, succession_crisis: 75 },
    },
    allowedStances: ['abandon', 'confront'],
    escalationHint: '若秦王仍犹豫，无忌可能挂冠或另投',
    once: true,
  },
];

// ===== 尉迟敬德：暴烈武将 =====
// 特征：耐心低、衰减快，偏好直接对抗
export const weiChiJingDeRules: NpcDecisionRule[] = [
  // 耐心高：观望为主，可以练兵
  {
    id: 'wcj_calm',
    conditions: { patienceAbove: 60 },
    allowedStances: ['observe', 'intel', 'mobilize'],
  },
  // 耐心中段：加紧练兵、温和进言
  {
    id: 'wcj_restless',
    conditions: { patienceBelow: 60, patienceAbove: 30 },
    allowedStances: ['persuade', 'mobilize', 'scheme'],
    escalationHint: '敬德心中焦躁，欲加紧武备',
  },
  // 耐心低：直接催促或对抗
  {
    id: 'wcj_aggressive',
    conditions: {
      patienceBelow: 30,
      pressureAbove: { qinwangfu_desperation: 50 },
    },
    allowedStances: ['confront', 'mobilize'],
    escalationHint: '敬德已按捺不住，或当面逼秦王决断',
  },
  // 破局：逼宫（一生一次）
  {
    id: 'wcj_breakdown',
    conditions: {
      patienceBelow: 15,
      pressureAbove: { qinwangfu_desperation: 70 },
    },
    allowedStances: ['breakdown', 'confront'],
    escalationHint: '敬德可能越级调兵、直闯秦王府逼决断',
    once: true,
    triggerEvent: 'skeleton_subordinate_ultimatum',
  },
];

// ===== 房玄龄：稳健谋士 =====
// 特征：耐心最高，擅长谋划和情报分析
export const fangXuanLingRules: NpcDecisionRule[] = [
  // 日常：观望 / 情报 / 谋划
  {
    id: 'fxl_daily',
    conditions: {},
    allowedStances: ['observe', 'intel', 'scheme'],
  },
  // 推进阶段：加上温和进言
  {
    id: 'fxl_planning',
    conditions: { pressureAbove: { succession_crisis: 50 } },
    allowedStances: ['intel', 'scheme', 'persuade'],
    escalationHint: '储位将明，玄龄须与无忌定方略',
  },
  // 关键时刻：加入对抗
  {
    id: 'fxl_urgent',
    conditions: {
      patienceBelow: 30,
      pressureAbove: { qinwangfu_desperation: 65 },
    },
    allowedStances: ['persuade', 'scheme', 'confront'],
    escalationHint: '玄龄须联无忌共谏秦王',
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
