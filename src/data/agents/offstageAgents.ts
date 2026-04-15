import type { OffstageAgent, PressureModifier, WorldState } from '../../types/world';

// ===== 幕后 Agent：不参与对话，纯确定性每日压力贡献 =====

/** 李建成：太子，主动打压秦王，拉拢朝臣 */
export const liJianCheng: OffstageAgent = {
  id: 'li_jiancheng',
  name: '李建成',
  dailyPressureEffects(state: WorldState): PressureModifier[] {
    const effects: PressureModifier[] = [];

    // 建成的敌意自然增长（在 velocity 之外的额外行动）
    // 只有当建成主动在搞事的时候才有
    if (state.pressureAxes.jiancheng_hostility.value > 50) {
      effects.push({
        axisId: 'court_opinion',
        delta: 0.5,
        reason: '建成在朝堂散布不利于秦王的舆论',
        source: 'li_jiancheng',
      });
    }

    // 建成拉拢秦王府部将的骚扰
    if (state.pressureAxes.jiancheng_hostility.value > 60) {
      effects.push({
        axisId: 'qinwangfu_desperation',
        delta: 0.3,
        reason: '建成收买秦王部将，人心不安',
        source: 'li_jiancheng',
      });
    }

    // 建成怂恿元吉
    effects.push({
      axisId: 'yuanji_ambition',
      delta: 0.2,
      reason: '建成纵容元吉冒进',
      source: 'li_jiancheng',
    });

    return effects;
  },
};

/** 李元吉：齐王，好战冲动，既协助建成又有自己的野心 */
export const liYuanJi: OffstageAgent = {
  id: 'li_yuanji',
  name: '李元吉',
  dailyPressureEffects(state: WorldState): PressureModifier[] {
    const effects: PressureModifier[] = [];

    // 元吉的冲动行为加剧局势
    if (state.pressureAxes.yuanji_ambition.value > 55) {
      effects.push({
        axisId: 'succession_crisis',
        delta: 0.3,
        reason: '元吉嚣张行事，朝野侧目',
        source: 'li_yuanji',
      });
    }

    // 元吉主动挑衅秦王
    if (state.pressureAxes.yuanji_ambition.value > 65) {
      effects.push({
        axisId: 'jiancheng_hostility',
        delta: 0.3,
        reason: '元吉撺掇建成加大力度',
        source: 'li_yuanji',
      });
    }

    // 元吉谋夺秦王兵权
    if (state.pressureAxes.yuanji_ambition.value > 75) {
      effects.push({
        axisId: 'military_readiness',
        delta: -0.5,
        reason: '元吉企图夺取秦王精兵',
        source: 'li_yuanji',
      });
    }

    return effects;
  },
};

/** 李渊：皇帝，试图平衡局面，但越来越力不从心 */
export const liYuan: OffstageAgent = {
  id: 'li_yuan',
  name: '李渊',
  dailyPressureEffects(state: WorldState): PressureModifier[] {
    const effects: PressureModifier[] = [];

    // 如果储位危机过高，李渊会尝试压制（但效果有限）
    if (state.pressureAxes.succession_crisis.value > 75) {
      effects.push({
        axisId: 'succession_crisis',
        delta: -0.5,
        reason: '陛下试图调和兄弟矛盾',
        source: 'li_yuan',
      });
      effects.push({
        axisId: 'imperial_suspicion',
        delta: 0.5,
        reason: '陛下在调和中对秦王更加警惕',
        source: 'li_yuan',
      });
    }

    // 如果朝堂舆论一边倒，李渊会被影响
    if (state.pressureAxes.court_opinion.value > 60) {
      effects.push({
        axisId: 'imperial_suspicion',
        delta: 0.3,
        reason: '朝臣进言影响陛下判断',
        source: 'li_yuan',
      });
    }

    return effects;
  },
};

// ===== 汇总 =====

export const OFFSTAGE_AGENTS: OffstageAgent[] = [liJianCheng, liYuanJi, liYuan];
