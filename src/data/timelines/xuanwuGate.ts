import type { TimelineConfig, SceneTransition } from '../../types';

export const xuanwuGateTimeline: TimelineConfig = {
  id: 'timeline_xuanwu_gate',
  name: '玄武门之变',
  description: '武德九年正月至六月，从暗流涌动到午夜密议，大唐命运的半年博弈',
  sceneOrder: [
    'scene_undercurrent',
    'scene_poisoned_wine',
    'scene_luoyang_debate',
    'scene_political_siege',
    'scene_taibai_omen',
    'scene_midnight_council',
  ],
};

export const xuanwuGateTransitions: SceneTransition[] = [
  {
    fromSceneId: 'scene_undercurrent',
    toSceneId: 'scene_poisoned_wine',
    transitionNarration: [
      '正月的部署暗中推进，秦王府在长安与洛阳之间织起一张隐秘的网。',
      '',
      '然而建成一方并未坐以待毙。',
      '二月，一封来自东宫的烫金请帖送到了秦王府——',
      '太子建成设宴，邀请秦王赴东宫夜饮。',
      '',
      '来者不善，善者不来。',
    ].join('\n'),
  },
  {
    fromSceneId: 'scene_poisoned_wine',
    toSceneId: 'scene_luoyang_debate',
    transitionNarration: [
      '东宫夜宴之后，兄弟之间最后的体面已荡然无存。',
      '',
      '建成与元吉加紧在陛下面前进言，',
      '朝中风向对秦王愈发不利。',
      '',
      '三月，陛下忽然召见秦王，',
      '提出一个令所有人都始料未及的方案——',
    ].join('\n'),
  },
  {
    fromSceneId: 'scene_luoyang_debate',
    toSceneId: 'scene_political_siege',
    transitionNarration: [
      '洛阳之议尘埃落定。',
      '',
      '然而接下来的两个月，形势急转直下。',
      '建成与元吉联络朝中内外，发动了一波又一波的政治攻势。',
      '弹劾奏疏如雪片般飞来，秦王府的处境日益艰难。',
      '',
      '四月至五月，秦王府陷入了前所未有的围困之中。',
    ].join('\n'),
  },
  {
    fromSceneId: 'scene_political_siege',
    toSceneId: 'scene_taibai_omen',
    transitionNarration: [
      '经历了两个月的政治绞杀，秦王府虽然伤痕累累，但核心班底尚在。',
      '',
      '六月初一，长安城上空万里无云。',
      '然而正午时分，一道异象划破天际——',
      '太白金星赫然出现在白昼的天穹之上，与日争辉。',
      '',
      '天象示变，人心思动。',
    ].join('\n'),
  },
  {
    fromSceneId: 'scene_taibai_omen',
    toSceneId: 'scene_midnight_council',
    transitionNarration: [
      '太白经天之后，朝局急转直下。',
      '',
      '六月初二，太子建成设计将房玄龄、杜如晦逐出秦王府。',
      '六月初三白天，东宫率更丞王晊冒死密报：',
      '太子与齐王将于明日昆明池饯行之时，伏杀秦王。',
      '',
      '入夜，长安城万籁俱寂。',
      '秦王府深处一间密室灯火通明——',
      '一场决定大唐命运的密议，即将开始。',
    ].join('\n'),
  },
];
