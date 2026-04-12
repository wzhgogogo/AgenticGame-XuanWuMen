import type { Character } from '../../types';

export const liShimin: Character = {
  id: 'li_shimin',
  name: '李世民',
  title: '秦王',
  age: 28,
  faction: '秦王府',
  role: 'player_character',
  color: '#FFD700',
  waitingText: '（你在沉思……）',
  identity: {
    oneLiner: '大唐秦王，天策上将，雄才大略却被迫走向夺嫡之路。',
    personality: {
      model: 'Big Five',
      scores: {
        openness: 85,
        conscientiousness: 90,
        extraversion: 75,
        agreeableness: 60,
        neuroticism: 45,
      },
      traitKeywords: ['果决', '隐忍', '重情义', '善纳谏', '杀伐果断'],
    },
    skills: [
      { name: '军事指挥', level: 95, note: '百战百胜，灭薛举、刘武周、王世充、窦建德' },
      { name: '政治谋略', level: 80, note: '善用人才，文学馆十八学士' },
      { name: '骑射武艺', level: 90, note: '每战身先士卒，箭术精湛' },
    ],
    speechStyle: {
      register: '王者气度，简洁有力，偶露杀机',
      patterns: ['以"孤"自称', '用典精练', '语气坚定但不失礼数'],
      never: ['粗俗之语', '犹豫不决的语气', '谄媚之词'],
    },
  },
  foundationalMemory: [
    {
      id: 'mem_ls_001',
      date: '武德元年',
      event: '随父起兵太原，西入关中，攻克长安，大唐开国。',
      emotionalTag: '豪情',
      importance: 10,
      relatedCharacters: ['changsun_wuji', 'weichi_jingde', 'fang_xuanling'],
    },
    {
      id: 'mem_ls_002',
      date: '武德四年',
      event: '虎牢关一战，三千骑兵大破窦建德十万大军，天下震动。',
      emotionalTag: '自豪',
      importance: 10,
      relatedCharacters: ['weichi_jingde'],
    },
    {
      id: 'mem_ls_003',
      date: '武德九年六月初一',
      event: '太白经天，傅奕密奏"太白见秦分，秦王当有天下"。太子建成借此向父皇进谗。',
      emotionalTag: '危机',
      importance: 10,
      relatedCharacters: ['changsun_wuji', 'fang_xuanling'],
    },
    {
      id: 'mem_ls_004',
      date: '武德九年六月初三',
      event: '建成、元吉密谋在昆明池饯行时诛杀自己，消息由东宫率更丞王晊泄露。',
      emotionalTag: '恐惧与愤怒',
      importance: 10,
      relatedCharacters: ['changsun_wuji', 'weichi_jingde', 'fang_xuanling'],
    },
  ],
  relationships: {
    changsun_wuji: {
      role: '大舅哥、谋主',
      trust: 95,
      dynamics: '至亲至信，长孙无忌是妻兄也是首席谋臣',
      tension: '无忌过于谨慎，有时会延误战机',
    },
    weichi_jingde: {
      role: '心腹猛将',
      trust: 90,
      dynamics: '战场生死之交，敬德忠勇无双',
      tension: '敬德性烈如火，需要驾驭其脾气',
    },
    fang_xuanling: {
      role: '首席智囊',
      trust: 90,
      dynamics: '房玄龄善谋，与杜如晦并称"房谋杜断"',
      tension: '玄龄有时过于小心，需要催促决断',
    },
  },
  goals: {
    longTerm: '平定天下之后不被兄弟所害，保全秦王府众人性命。',
    shortTerm: [
      '确认建成、元吉的暗杀计划细节',
      '说服犹豫的幕僚下定决心',
      '制定玄武门伏击方案',
    ],
    internalConflict: '骨肉相残违背人伦，但不动手则死的是自己和追随者。',
  },
};
