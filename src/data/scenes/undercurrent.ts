import type { SceneConfig } from '../../types';

export const undercurrent: SceneConfig = {
  id: 'scene_undercurrent',
  time: '武德九年正月',
  location: '秦王府·书房',
  narratorIntro: [
    '武德九年，正月。',
    '',
    '新年的爆竹声尚未消散，长安城中已暗流涌动。',
    '太子建成与齐王元吉联手排挤秦王府的态势日益明显——',
    '朝堂之上，东宫一系步步紧逼；暗地里，收买秦王府部将的举动从未停歇。',
    '',
    '秦王府书房，炭火微明。',
    '长孙无忌与房玄龄受召而来，三人围坐案前。',
    '窗外寒风呼啸，屋内气氛凝重。',
    '',
    '新年伊始，秦王府必须有所动作了。',
  ].join('\n'),
  activeNpcIds: ['changsun_wuji', 'fang_xuanling'],
  phases: [
    {
      id: 'phase_situation',
      name: '形势研判',
      turnRange: [1, 3],
      suggestedActions: [
        '询问近日建成、元吉的动向',
        '分析朝中各方势力的站位',
        '评估秦王府目前的处境',
        '试探众人对时局的判断',
      ],
    },
    {
      id: 'phase_deploy',
      name: '暗棋布局',
      turnRange: [4, 6],
      suggestedActions: [
        '商议是否派温大雅、张亮赴洛阳联络山东豪杰',
        '讨论调屈突通回长安的利弊',
        '安排秦王府内部的防范措施',
        '考虑拉拢朝中中立派',
      ],
    },
    {
      id: 'phase_zhang_liang',
      name: '张亮之险',
      turnRange: [7, 9],
      suggestedActions: [
        '张亮被告谋反下狱，商议是否设法营救',
        '分析张亮若招供会牵连多少人',
        '派人打探狱中情况',
        '考虑暂停洛阳方面的行动',
      ],
    },
  ],
  endingTrigger: {
    minTurns: 5,
    maxTurns: 9,
  },
};
