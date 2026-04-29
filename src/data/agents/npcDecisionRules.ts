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
  // ===== 敌对方与皇帝（v3.4.4 升级为 NPC）=====
  li_jiancheng: {
    whitelist: ['jiancheng_hostility', 'court_opinion', 'succession_crisis', 'qinwangfu_desperation'],
  },
  li_yuanji: {
    whitelist: ['yuanji_ambition', 'jiancheng_hostility', 'military_readiness', 'qinwangfu_desperation'],
  },
  li_yuan: {
    whitelist: ['imperial_suspicion', 'succession_crisis', 'court_opinion'],
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
  {
    id: 'csw_alert',
    conditions: { alertnessAbove: 30 },
    allowedStances: ['analyze', 'counterspy', 'scheme'],
    escalationHint: '近日事端频发，无忌警觉大增，须主动刺探敌情、谋划应对',
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
  {
    id: 'wcj_alert',
    conditions: { alertnessAbove: 30 },
    allowedStances: ['patrol', 'rally', 'analyze'],
    escalationHint: '敬德已闻风声，日夜巡防府邸，整备亲兵',
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
  {
    id: 'fxl_alert',
    conditions: { alertnessAbove: 30 },
    allowedStances: ['analyze', 'coordinate'],
    escalationHint: '玄龄察觉局势骤变，须核实情报、协调各方',
  },
];

// ===== 李建成：东宫太子，持续政治打压 =====
export const liJianChengRules: NpcDecisionRule[] = [
  {
    id: 'lijc_daily',
    conditions: {},
    allowedStances: ['observe', 'lobby', 'scheme', 'analyze'],
  },
  {
    id: 'lijc_active',
    conditions: { pressureAbove: { jiancheng_hostility: 50 } },
    allowedStances: ['lobby', 'scheme', 'coordinate', 'plant_spy'],
    escalationHint: '太子在朝堂主动散布对秦王不利的舆论，并暗中收买秦王部将',
  },
  {
    id: 'lijc_aggressive',
    conditions: { pressureAbove: { succession_crisis: 60 } },
    allowedStances: ['plant_spy', 'pressure', 'scheme', 'lobby'],
    escalationHint: '太子加紧监视秦王府，并向父皇请求处置秦王',
  },
  {
    id: 'lijc_decisive',
    conditions: { pressureAbove: { succession_crisis: 80 } },
    allowedStances: ['assassinate', 'capture', 'pressure'],
    escalationHint: '太子已下定决心，可设宴鸩酒、伏弓暗杀，宁负骨肉之名也要先除秦王',
  },
  {
    id: 'lijc_alert',
    conditions: { alertnessAbove: 30 },
    allowedStances: ['plant_spy', 'scheme', 'analyze'],
    escalationHint: '太子嗅到异动，加紧安插眼线、监控秦王府一举一动',
  },
];

// ===== 李元吉：齐王，表面助大哥实欲二虎相争 =====
export const liYuanJiRules: NpcDecisionRule[] = [
  {
    id: 'lyj_daily',
    conditions: {},
    allowedStances: ['observe', 'drill', 'pressure'],
  },
  {
    id: 'lyj_active',
    conditions: { pressureAbove: { yuanji_ambition: 50 } },
    allowedStances: ['lobby', 'scheme', 'pressure', 'rally'],
    escalationHint: '元吉怂恿大哥加大力度，同时操练自家齐王府兵马',
  },
  {
    id: 'lyj_aggressive',
    conditions: { pressureAbove: { yuanji_ambition: 65 } },
    allowedStances: ['capture', 'pressure', 'defy', 'scheme'],
    escalationHint: '元吉欲借突厥之机夺秦王精兵，奏请代秦王北征',
  },
  {
    id: 'lyj_assassin',
    conditions: { pressureAbove: { yuanji_ambition: 75 } },
    allowedStances: ['assassinate', 'capture', 'pressure'],
    escalationHint: '元吉性烈手狠，可借猎场伏弓、宴会暗算等极端方式直取秦王',
  },
  {
    id: 'lyj_fishing',
    conditions: {
      pressureAbove: { jiancheng_hostility: 70, qinwangfu_desperation: 60 },
    },
    allowedStances: ['scheme', 'pressure', 'plant_spy'],
    escalationHint: '元吉表面与大哥同心，实则盼二虎相争两败俱伤——既怂恿建成下狠手，又暗中加重秦王府危机感',
  },
  {
    id: 'lyj_alert',
    conditions: { alertnessAbove: 30 },
    allowedStances: ['rally', 'pressure', 'capture'],
    escalationHint: '元吉闻讯而动，立即整兵施压，趁乱扩大优势',
  },
];

// ===== 李渊：开国皇帝，挑动诸子相争维持自身帝位 =====
export const liYuanRules: NpcDecisionRule[] = [
  {
    id: 'lyy_daily',
    conditions: {},
    allowedStances: ['observe', 'advise'],
  },
  {
    id: 'lyy_balance',
    conditions: { pressureAbove: { succession_crisis: 60 } },
    allowedStances: ['advise', 'lobby', 'strategize'],
    escalationHint: '陛下名为调和兄弟，实为压一方抬另一方——保持三角平衡，不让任一方坐大',
  },
  {
    id: 'lyy_suspicious',
    conditions: { pressureAbove: { imperial_suspicion: 70 } },
    allowedStances: ['pressure', 'capture', 'lobby'],
    escalationHint: '陛下对秦王的猜疑已重，可借机削其兵权或调离京师',
  },
  {
    id: 'lyy_imperial',
    conditions: { pressureAbove: { court_opinion: 70 } },
    allowedStances: ['strategize', 'lobby', 'advise'],
    escalationHint: '朝堂舆论一边倒，陛下被裹挟其中，需以帝王手腕从中调控',
  },
  {
    id: 'lyy_balance_act',
    conditions: {
      pressureAbove: { jiancheng_hostility: 60, qinwangfu_desperation: 60 },
    },
    allowedStances: ['strategize', 'lobby'],
    escalationHint: '陛下挑动兄弟相争的真正目的是保住自己的皇位——任何一方独大都不可接受',
  },
  {
    id: 'lyy_alert',
    conditions: { alertnessAbove: 30 },
    allowedStances: ['strategize', 'lobby'],
    escalationHint: '陛下察知事端，着人查探虚实、召重臣商议对策',
  },
];

// ===== NPC 耐心衰减速率 =====

export const NPC_PATIENCE_DECAY: Record<string, number> = {
  changsun_wuji: 0.5,
  weichi_jingde: 1.5,
  fang_xuanling: 0.3,
  li_jiancheng: 0.4,
  li_yuanji: 1.5,
  li_yuan: 0.2,
};

// ===== 汇总 =====

export const NPC_DECISION_RULES: Record<string, NpcDecisionRule[]> = {
  changsun_wuji: changSunWujiRules,
  weichi_jingde: weiChiJingDeRules,
  fang_xuanling: fangXuanLingRules,
  li_jiancheng: liJianChengRules,
  li_yuanji: liYuanJiRules,
  li_yuan: liYuanRules,
};
