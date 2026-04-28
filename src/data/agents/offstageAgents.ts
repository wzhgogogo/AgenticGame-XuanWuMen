import type { OffstageAgent } from '../../types/world';

/**
 * 幕后 Agent：不参与对话，纯确定性每日压力贡献。
 *
 * v3.4.4：原李建成 / 李元吉 / 李渊 三人已升级为完整 NPC（见 src/data/characters/li{Jiancheng,YuanJi,Yuan}.ts），
 * 由 NPC Agent 系统每日 LLM 决策驱动。本数组现暂为空，等待补充其他历史人物
 * （如秦叔宝、程咬金、魏征等）作为新的背景压力贡献者。
 */
export const OFFSTAGE_AGENTS: OffstageAgent[] = [];
