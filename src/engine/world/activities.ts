import type {
  DailyActivity,
  WorldState,
  PressureModifier,
  PressureAxisId,
} from '../../types/world';

// ===== 活动效果应用 =====

export function applyActivityEffects(
  state: WorldState,
  activity: DailyActivity,
): { state: WorldState; pressureChanges: PressureModifier[] } {
  const pressureChanges: PressureModifier[] = [];
  let newState = { ...state };

  for (const effect of activity.effects) {
    switch (effect.type) {
      case 'pressure': {
        const mod: PressureModifier = {
          axisId: effect.params.axisId as PressureAxisId,
          delta: effect.params.delta as number,
          reason: `${activity.name}`,
          source: `activity_${activity.id}`,
        };
        pressureChanges.push(mod);
        break;
      }
      case 'npc_patience': {
        const charId = effect.params.characterId as string;
        const delta = effect.params.delta as number;
        const agent = newState.npcAgents[charId];
        if (agent) {
          newState = {
            ...newState,
            npcAgents: {
              ...newState.npcAgents,
              [charId]: {
                ...agent,
                patience: Math.max(0, Math.min(100, agent.patience + delta)),
              },
            },
          };
        }
        break;
      }
      case 'flag': {
        const key = effect.params.key as string;
        const value = effect.params.value ?? true;
        newState = {
          ...newState,
          globalFlags: { ...newState.globalFlags, [key]: value },
        };
        break;
      }
      // relationship 效果在后续版本实现
    }
  }

  return { state: newState, pressureChanges };
}

// ===== 活动数据 =====

export const GOVERNANCE_ACTIVITIES: DailyActivity[] = [
  {
    id: 'review_memorials',
    name: '批阅奏折',
    category: 'governance',
    description: '处理天策上将府日常公文，维系朝堂人脉。',
    duration: 'morning',
    effects: [
      { type: 'pressure', params: { axisId: 'court_opinion', delta: -2 } },
    ],
    flavorTexts: [
      '案上堆满了各地军报和朝臣奏章。秦王逐一批阅，朱笔勾画间，朝堂脉络渐渐清晰。',
      '一份关于突厥动向的急报引起了注意——北方的事，或许可以做文章。',
      '批完最后一份奏折，秦王揉了揉眉心。政务繁忙，但每一笔都关乎人心向背。',
    ],
  },
  {
    id: 'meet_officials',
    name: '接见朝臣',
    category: 'governance',
    description: '会见中立派或秦王府旧部，维系关系，探听风向。',
    duration: 'afternoon',
    effects: [
      { type: 'pressure', params: { axisId: 'imperial_suspicion', delta: -1.5 } },
      { type: 'pressure', params: { axisId: 'court_opinion', delta: -1 } },
    ],
    flavorTexts: [
      '几位旧部前来拜会，言谈间提到近日朝堂上的微妙变化。',
      '一位中立朝臣含蓄地表示，陛下近来对东宫也有不满。这是机会还是陷阱？',
      '会客毕，秦王目送来人离去。人心似水，需要一一打点。',
    ],
  },
];

export const MILITARY_ACTIVITIES: DailyActivity[] = [
  {
    id: 'train_troops',
    name: '练兵演武',
    category: 'military',
    description: '在秦王府校场操练亲兵，保持战力。',
    duration: 'morning',
    effects: [
      { type: 'pressure', params: { axisId: 'military_readiness', delta: 3 } },
    ],
    flavorTexts: [
      '晨光中，秦王亲自下场演武。刀光剑影间，将士们士气大振。',
      '操练了新阵法，敬德看了连连点头："殿下，这阵法若用在……"话未说完，意味深长。',
      '汗水淋漓。但每多练一日，便多一分把握。',
    ],
  },
  {
    id: 'inspect_guards',
    name: '巡视府卫',
    category: 'military',
    description: '检查秦王府防务，确保安全。',
    duration: 'afternoon',
    effects: [
      { type: 'pressure', params: { axisId: 'military_readiness', delta: 1.5 } },
      { type: 'pressure', params: { axisId: 'qinwangfu_desperation', delta: -1 } },
    ],
    flavorTexts: [
      '逐一查看了府卫的值守安排。一切如常——但"如常"本身就是一种奢侈。',
      '几个新来的护卫看起来面生。秦王多看了一眼，吩咐长孙无忌去查核底细。',
    ],
  },
];

export const INTELLIGENCE_ACTIVITIES: DailyActivity[] = [
  {
    id: 'summon_spy',
    name: '召见密探',
    category: 'intelligence',
    description: '听取暗探的最新消息，了解东宫和齐王府的动向。',
    duration: 'evening',
    effects: [
      { type: 'pressure', params: { axisId: 'imperial_suspicion', delta: 0.5 } }, // 有暴露风险
      { type: 'flag', params: { key: 'has_recent_intel', value: true } },
    ],
    flavorTexts: [
      '密探从暗门入府，压低声音禀报了东宫近日的异常调动。',
      '"殿下，齐王近日频繁出入兵部……"消息令人不安，但知道总比不知道好。',
      '送走密探，秦王陷入沉思。情报的价值在于行动，否则不过是徒增烦恼。',
    ],
  },
  {
    id: 'contact_insiders',
    name: '联络宫中内应',
    category: 'intelligence',
    description: '与宫中已策反的人员联络，为关键时刻做准备。',
    duration: 'evening',
    effects: [
      { type: 'pressure', params: { axisId: 'military_readiness', delta: 2 } },
      { type: 'pressure', params: { axisId: 'imperial_suspicion', delta: 1 } }, // 高风险
      { type: 'flag', params: { key: 'palace_insider_contacted', value: true } },
    ],
    flavorTexts: [
      '通过可靠渠道传了一封密信。宫中的眼线回复：一切就绪，只等殿下号令。',
      '联络越频繁，暴露的风险越大。但到了这一步，已经没有退路。',
    ],
  },
];

export const SOCIAL_ACTIVITIES: DailyActivity[] = [
  {
    id: 'reassure_jingde',
    name: '安抚尉迟敬德',
    category: 'social',
    description: '与敬德饮酒谈心，安抚他的急躁情绪。',
    duration: 'evening',
    effects: [
      { type: 'npc_patience', params: { characterId: 'weichi_jingde', delta: 8 } },
    ],
    flavorTexts: [
      '"敬德，再忍忍。"秦王举杯，敬德闷声灌了一碗酒："殿下说忍，臣便忍。但这忍字……太苦。"',
      '敬德的手按在刀柄上，指节发白。秦王知道，这头猛虎越来越难驯了。',
    ],
  },
  {
    id: 'counsel_wuji',
    name: '与长孙无忌密谈',
    category: 'social',
    description: '与无忌深入交流，听取谋划建议。',
    duration: 'afternoon',
    effects: [
      { type: 'npc_patience', params: { characterId: 'changsun_wuji', delta: 5 } },
      { type: 'pressure', params: { axisId: 'military_readiness', delta: 1 } },
    ],
    flavorTexts: [
      '无忌铺开长安城防图，指着玄武门方向，低声说了几句。秦王点了点头。',
      '"殿下，时机未到。但准备必须到。"无忌的话一如既往地稳。',
    ],
  },
  {
    id: 'counsel_xuanling',
    name: '与房玄龄议事',
    category: 'social',
    description: '听取玄龄对局势的分析和建议。',
    duration: 'morning',
    effects: [
      { type: 'npc_patience', params: { characterId: 'fang_xuanling', delta: 4 } },
      { type: 'pressure', params: { axisId: 'qinwangfu_desperation', delta: -1 } },
    ],
    flavorTexts: [
      '玄龄条分缕析，将朝中各派的立场摆得清清楚楚。这些信息价值千金。',
      '"殿下，急不得。但也拖不得。"房玄龄欲言又止，最终还是咽下了后半句。',
    ],
  },
];

export const PERSONAL_ACTIVITIES: DailyActivity[] = [
  {
    id: 'study',
    name: '温书习字',
    category: 'personal',
    description: '在书房静心读书练字，暂时放空。',
    duration: 'evening',
    effects: [],
    flavorTexts: [
      '灯下展卷，读的是《孙子兵法》。"兵者，国之大事，死生之地，存亡之道——"何尝不是在读自己。',
      '磨墨提笔，写了一个"忍"字。看了半天，又写了一个"决"。',
      '夜深人静，秦王独坐书房。窗外月光如水，照在案上的兵书上。',
    ],
  },
  {
    id: 'family_time',
    name: '陪伴家眷',
    category: 'personal',
    description: '回内院陪伴长孙王妃和孩子们。',
    duration: 'evening',
    effects: [
      { type: 'pressure', params: { axisId: 'qinwangfu_desperation', delta: -0.5 } },
    ],
    flavorTexts: [
      '长孙王妃递来一碗银耳汤，什么也没问。有些话不用说出口。',
      '小承乾在院里追蝴蝶，笑声清脆。这一切的挣扎，不也是为了他们？',
    ],
  },
];

// ===== 全部活动汇总 =====

export const ALL_ACTIVITIES: DailyActivity[] = [
  ...GOVERNANCE_ACTIVITIES,
  ...MILITARY_ACTIVITIES,
  ...INTELLIGENCE_ACTIVITIES,
  ...SOCIAL_ACTIVITIES,
  ...PERSONAL_ACTIVITIES,
];

/** 按时间段获取可用活动 */
export function getActivitiesForTimeSlot(
  timeOfDay: 'morning' | 'afternoon' | 'evening',
): DailyActivity[] {
  return ALL_ACTIVITIES.filter((a) => a.duration === timeOfDay);
}

/** 随机获取风味文本 */
export function getFlavorText(activity: DailyActivity): string {
  if (activity.flavorTexts.length === 0) return '';
  const idx = Math.floor(Math.random() * activity.flavorTexts.length);
  return activity.flavorTexts[idx];
}
