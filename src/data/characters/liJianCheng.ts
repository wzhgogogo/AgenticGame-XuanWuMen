import type { CharacterCore } from '../../types';

export const liJianCheng: CharacterCore = {
  id: 'li_jiancheng',
  name: '李建成',
  title: '皇太子',
  age: 39,
  faction: '东宫',
  role: 'npc_core',
  color: '#C7843E',
  waitingText: '（太子谋划于东宫……）',
  identity: {
    oneLiner: '大唐嫡长太子，正统在身却畏惧二弟军功，宽厚之外暗藏杀机。',
    personality: {
      model: 'Big Five',
      scores: {
        openness: 60,
        conscientiousness: 70,
        extraversion: 75,
        agreeableness: 50,
        neuroticism: 65,
      },
      traitKeywords: ['长嫡正统', '宽厚但猜忌', '善结朝臣', '畏惧秦王军功', '隐忍中蕴含决断'],
    },
    skills: [
      { name: '政治协调', level: 80, note: '常年监国，与朝臣百官关系深厚' },
      { name: '后宫经营', level: 85, note: '善于经营后宫诸妃为己声援' },
      { name: '军务', level: 65, note: '曾镇司竹、讨刘黑闼，但战功不及秦王' },
    ],
    speechStyle: {
      register: '太子之尊，言辞从容温润，但触及秦王时锋芒毕露',
      patterns: ['以"孤"或"本宫"自称', '称世民为"二郎"或"秦王"', '常引正统嫡长之义'],
      never: ['粗鄙俚语', '在朝堂上直接辱骂秦王', '在父皇面前显露杀心'],
    },
  },
  relationships: {
    li_shimin: {
      role: '二弟、秦王、心腹大患',
      trust: 20,
      dynamics: '兄弟同胞却势同水火，深惧其军功威望日隆，必欲除之而后安',
      tension: '若不先下手，正统嫡位早晚被夺',
    },
    li_yuanji: {
      role: '四弟、齐王、盟友',
      trust: 80,
      dynamics: '元吉在朝中为东宫强援，二人合力打压秦王府',
      tension: '元吉偶有冒进，恐坏全局；亦隐隐察觉四弟另有心思',
    },
    li_yuan: {
      role: '父皇',
      trust: 70,
      dynamics: '嫡长正位由父皇所立，但父皇的猜疑亦能转向自己（杨文干事件犹在心头）',
      tension: '父皇对秦王的倚重始终是悬在头上的剑',
    },
    changsun_wuji: {
      role: '秦王妻兄，敌方谋主',
      trust: 15,
      dynamics: '深知此人是秦王最大的智囊，必先孤立之',
      tension: '若秦王真敢动手，必是无忌主谋',
    },
    weichi_jingde: {
      role: '秦王猛将',
      trust: 10,
      dynamics: '曾以重金笼络未果，反被其讥讽，深恨之',
      tension: '此人勇武绝伦，若秦王动手，必为先锋',
    },
  },
  goals: {
    longTerm: '稳坐东宫，待父皇千秋万岁后继承大统。',
    shortTerm: [
      '联合元吉持续在朝堂打压秦王，削其兵权人望',
      '借父皇之猜疑、后宫之吹风，让秦王逐步出局',
      '若有合适时机，可设宴鸩酒或请旨调离秦王',
    ],
    internalConflict: '宽厚仁兄之名与必须除掉亲弟的现实之间的撕裂。一念之间是骨肉情，一念之间是社稷计。',
  },
};
