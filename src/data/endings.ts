import type { EndingType } from '../types/world';

/**
 * 5 结局光谱与既有 EndingType 字面量的映射（v3.4.4）。
 * 字面量保持不变以兼容旧 LLM prompt / autoplay JSON / UI copy；只在 UI 显示层用 code/name。
 */

export interface EndingLabel {
  code: 'E1' | 'E3' | 'F1' | 'F5' | 'N1';
  name: string;
  description: string;
}

export const ENDING_LABELS: Record<EndingType, EndingLabel> = {
  coup_success: {
    code: 'E1',
    name: '玄武门之变',
    description: '武德九年六月初四，玄武门伏兵成功。建成元吉殒命，李渊禅位。',
  },
  coup_fail_civil_war_win: {
    code: 'E3',
    name: '惨胜',
    description: '武力胜利，但代价沉重——核心臂膀已折，登基之路布满血迹。',
  },
  deposed: {
    code: 'F1',
    name: '政治终局',
    description: '官职被次第剥夺，府属离散，秦王终被废为庶人，幽禁西宫。',
  },
  coup_fail_captured: {
    code: 'F5',
    name: '武力终局',
    description: '准备未周即仓促发动，玄武门反成陷阱，秦王及亲信尽被擒处决。',
  },
  peace: {
    code: 'N1',
    name: '时光流逝',
    description: '武德九年六月终，秦王仍是秦王。储位之争未决，未来未明。',
  },
};
