import type { GameState, SceneOutcome, Decision, RelationshipDelta } from '../types';

/**
 * 从场景的 GameState 提取 SceneOutcome。
 * v2.0 用启发式规则，后续可替换为 LLM 摘要。
 */
export function buildSceneOutcome(
  sceneId: string,
  gameState: GameState,
): SceneOutcome {
  const summary = gameState.endingText || '场景结束。';
  const keyDecisions = extractDecisions(sceneId, gameState);
  const relationshipDeltas = estimateRelationshipDeltas(gameState);

  return {
    sceneId,
    summary,
    keyDecisions,
    relationshipDeltas,
    turnCount: gameState.playerTurnCount,
  };
}

/** 从玩家对话中提取关键决策 */
function extractDecisions(sceneId: string, gameState: GameState): Decision[] {
  const decisions: Decision[] = [];
  let turnCounter = 0;

  for (const entry of gameState.dialogueHistory) {
    if (entry.type === 'player') {
      turnCounter++;
      const content = entry.content;

      // 识别决断性发言
      const decisivePatterns = [
        { pattern: /动手|出击|进攻|伏击/, tag: '决定采取行动' },
        { pattern: /放弃|算了|罢了|不干/, tag: '决定放弃' },
        { pattern: /准备|部署|安排|分工/, tag: '开始筹备' },
        { pattern: /试探|打探|刺探/, tag: '收集情报' },
        { pattern: /隐忍|退让|忍耐/, tag: '选择隐忍' },
        { pattern: /联合|联络|拉拢/, tag: '寻求盟友' },
      ];

      for (const { pattern, tag } of decisivePatterns) {
        if (pattern.test(content)) {
          decisions.push({
            id: `dec_${sceneId}_${turnCounter}`,
            description: `${tag}：${content.slice(0, 50)}`,
            turn: turnCounter,
          });
          break;
        }
      }
    }
  }

  return decisions;
}

/** 基于玩家行为的启发式关系变化估算 */
function estimateRelationshipDeltas(gameState: GameState): RelationshipDelta[] {
  const deltas: RelationshipDelta[] = [];
  const playerEntries = gameState.dialogueHistory.filter((e) => e.type === 'player');

  if (playerEntries.length === 0) return deltas;

  // 统计玩家态度倾向
  let decisiveCount = 0;
  let hesitantCount = 0;

  for (const entry of playerEntries) {
    const c = entry.content;
    if (/动手|出击|杀|决断|不再犹豫/.test(c)) decisiveCount++;
    if (/犹豫|两难|不忍|仁义|兄弟/.test(c)) hesitantCount++;
  }

  // 尉迟敬德喜欢果断，嫌犹豫
  if (decisiveCount > hesitantCount) {
    deltas.push({
      characterId: 'weichi_jingde',
      targetId: 'li_shimin',
      trustChange: 3,
      reason: '秦王展现了果断的决心',
    });
  } else if (hesitantCount > decisiveCount) {
    deltas.push({
      characterId: 'weichi_jingde',
      targetId: 'li_shimin',
      trustChange: -2,
      reason: '秦王过于犹豫不决',
    });
  }

  // 长孙无忌重视谨慎但也需要决心
  if (decisiveCount >= 2 && hesitantCount >= 1) {
    deltas.push({
      characterId: 'changsun_wuji',
      targetId: 'li_shimin',
      trustChange: 2,
      reason: '秦王既有决断又有深思',
    });
  }

  // 房玄龄偏好周密的计划
  const planningCount = playerEntries.filter((e) =>
    /计划|部署|安排|分析|周密|细节/.test(e.content),
  ).length;
  if (planningCount >= 2) {
    deltas.push({
      characterId: 'fang_xuanling',
      targetId: 'li_shimin',
      trustChange: 2,
      reason: '秦王注重周密谋划',
    });
  }

  return deltas;
}
