import type { NpcDecisionRule, NpcImpactProfile } from '../../types/world';

// ===== 每 NPC 压力影响白名单 =====
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
export const changSunWujiRules: NpcDecisionRule[] = [
  {
    id: 'csw_daily',
    conditions: {},
    allowedStances: ['observe', 'plant_spy', 'counterspy', 'analyze', 'advise'],
  },
  {
    id: 'csw_tense',
    conditions: { pressureAbove: { succession_crisis: 55 } },
    allowedStances: ['observe', 'plant_spy', 'analyze', 'advise', 'scheme', 'coordinate', 'strategize'],
    escalationHint: '储位已明紧张，须有所筹谋',
  },
  {
    id: 'csw_urgent',
    conditions: {
      patienceBelow: 40,
      pressureAbove: { qinwangfu_desperation: 60 },
    },
    allowedStances: ['advise', 'remonstrate', 'lobby', 'scheme', 'coordinate', 'strategize', 'pressure'],
    escalationHint: '府中众心已动，须催秦王决断',
  },
  {
    id: 'csw_abandon',
    conditions: {
      patienceBelow: 10,
      pressureAbove: { qinwangfu_desperation: 80, succession_crisis: 75 },
    },
    allowedStances: ['abandon', 'pressure'],
    escalationHint: '若秦王仍犹豫，无忌可能挂冠或另投',
    once: true,
  },
];

// ===== 尉迟敬德：暴烈武将 =====
export const weiChiJingDeRules: NpcDecisionRule[] = [
  {
    id: 'wcj_calm',
    conditions: { patienceAbove: 60 },
    allowedStances: ['observe', 'plant_spy', 'drill', 'patrol'],
  },
  {
    id: 'wcj_restless',
    conditions: { patienceBelow: 60, patienceAbove: 30 },
    allowedStances: ['advise', 'drill', 'rally', 'patrol', 'pressure', 'capture'],
    escalationHint: '敬德心中焦躁，欲加紧武备',
  },
  {
    id: 'wcj_aggressive',
    conditions: {
      patienceBelow: 30,
      pressureAbove: { qinwangfu_desperation: 50 },
    },
    allowedStances: ['pressure', 'defy', 'drill', 'rally', 'assassinate', 'capture'],
    escalationHint: '敬德已按捺不住，或当面逼秦王决断',
  },
  {
    id: 'wcj_impatient',
    conditions: {
      patienceBelow: 30,
    },
    allowedStances: ['advise', 'remonstrate', 'pressure', 'defy', 'rally'],
    escalationHint: '敬德日渐焦躁，如困兽犹斗',
  },
  {
    id: 'wcj_breakdown',
    conditions: {
      patienceBelow: 15,
      pressureAbove: { qinwangfu_desperation: 70 },
    },
    allowedStances: ['breakdown', 'defy'],
    escalationHint: '敬德可能越级调兵、直闯秦王府逼决断',
    once: true,
    triggerEvent: 'skeleton_subordinate_ultimatum',
  },
];

// ===== 房玄龄：稳健谋士 =====
export const fangXuanLingRules: NpcDecisionRule[] = [
  {
    id: 'fxl_daily',
    conditions: {},
    allowedStances: ['observe', 'plant_spy', 'analyze', 'advise', 'strategize'],
  },
  {
    id: 'fxl_planning',
    conditions: { pressureAbove: { succession_crisis: 50 } },
    allowedStances: ['analyze', 'coordinate', 'strategize', 'lobby', 'scheme'],
    escalationHint: '储位将明，玄龄须与无忌定方略',
  },
  {
    id: 'fxl_urgent',
    conditions: {
      patienceBelow: 30,
      pressureAbove: { qinwangfu_desperation: 65 },
    },
    allowedStances: ['advise', 'remonstrate', 'lobby', 'coordinate', 'strategize', 'pressure'],
    escalationHint: '玄龄须联无忌共谏秦王',
  },
];

// ===== NPC 耐心衰减速率 =====

export const NPC_PATIENCE_DECAY: Record<string, number> = {
  changsun_wuji: 0.5,
  weichi_jingde: 2.0,
  fang_xuanling: 0.3,
};

// ===== 汇总 =====

export const NPC_DECISION_RULES: Record<string, NpcDecisionRule[]> = {
  changsun_wuji: changSunWujiRules,
  weichi_jingde: weiChiJingDeRules,
  fang_xuanling: fangXuanLingRules,
};
