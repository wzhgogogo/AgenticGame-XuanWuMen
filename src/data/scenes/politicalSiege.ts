import type { SceneConfig } from '../../types';

export const politicalSiege: SceneConfig = {
  id: 'scene_political_siege',
  time: '武德九年四月至五月',
  location: '秦王府·密室',
  narratorIntro: [
    '武德九年，四月。',
    '',
    '自三月以来，建成与元吉的攻势愈发凌厉。',
    '朝中外臣纷纷上书弹劾秦王，宫中张婕妤、尹德妃等人亦在陛下耳边不断进谗。',
    '一封封奏疏如连弩攒射，字字诛心。',
    '',
    '五月，突厥郁射设率数万骑犯边。',
    '建成趁机上奏，请以齐王元吉代秦王督军北征——',
    '名为征突厥，实则要调走秦王府麾下尉迟敬德、秦叔宝、程知节等猛将精兵。',
    '',
    '此计若成，秦王府将沦为一座空城。',
    '众人再聚密室，形势已到了最危急的关头。',
  ].join('\n'),
  activeNpcIds: ['changsun_wuji', 'weichi_jingde', 'fang_xuanling'],
  phases: [
    {
      id: 'phase_political_attack',
      name: '政治绞杀',
      turnRange: [1, 3],
      suggestedActions: [
        '分析弹劾奏疏的影响有多大',
        '商讨如何反击朝中攻击',
        '是否争取中立朝臣的支持',
        '评估陛下目前的态度',
      ],
    },
    {
      id: 'phase_military_strip',
      name: '夺兵之危',
      turnRange: [4, 6],
      suggestedActions: [
        '讨论元吉代秦王出征意味着什么',
        '是否上书请求亲自领兵',
        '如何保住尉迟敬德等核心将领',
        '分析突厥入侵是否为建成借刀杀人',
      ],
    },
    {
      id: 'phase_last_stand',
      name: '绝境求生',
      turnRange: [7, 9],
      suggestedActions: [
        '秦王府已四面楚歌，是继续隐忍还是准备摊牌',
        '加紧笼络玄武门守将',
        '安排秦王府家眷的退路',
        '向众人摊明最坏的情况',
      ],
    },
  ],
  endingTrigger: {
    minTurns: 5,
    maxTurns: 9,
  },
};
