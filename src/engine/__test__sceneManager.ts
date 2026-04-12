/**
 * 场景引擎验证脚本
 *
 * 使用方法：在 App.tsx 中临时调用 testSceneManager()
 * 在浏览器控制台查看完整的游戏流程
 */
import { SceneManager } from './sceneManager';
import { createLLMProvider } from './llm';
import { getNpcCharacters, getPlayerCharacter } from '../data/characters';
import { defaultScene as sceneConfig } from '../data/scenes';

export async function testSceneManager() {
  const config = {
    provider: import.meta.env.VITE_LLM_PROVIDER || 'anthropic',
    apiKey: import.meta.env.VITE_LLM_API_KEY || '',
    model: import.meta.env.VITE_LLM_MODEL || 'claude-sonnet-4-20250514',
    baseUrl: import.meta.env.VITE_LLM_BASE_URL || undefined,
  };

  if (!config.apiKey) {
    console.error('请在 .env 中配置 VITE_LLM_API_KEY');
    return;
  }

  const provider = createLLMProvider(config);
  const player = getPlayerCharacter();
  const npcs = getNpcCharacters();

  const manager = new SceneManager(provider, sceneConfig, npcs, player);

  // 订阅状态变更
  manager.subscribe((state) => {
    console.log(
      `[状态更新] status=${state.status}, turns=${state.playerTurnCount}, phase=${state.currentPhaseIndex}, thinking=${state.isNpcThinking}`,
    );
    if (state.dialogueHistory.length > 0) {
      const last = state.dialogueHistory[state.dialogueHistory.length - 1];
      console.log(
        `  最新对话: [${last.type}${last.speakerName ? ' ' + last.speakerName : ''}] ${last.content.slice(0, 80)}...`,
      );
    }
  });

  console.log('=== 启动游戏 ===');
  await manager.startGame();

  console.log('\n=== 当前预设选项 ===');
  console.log(manager.getSuggestedActions());

  console.log('\n=== 提交玩家输入 ===');
  await manager.submitPlayerAction('出了什么事？细细说来。');

  console.log('\n=== 当前状态 ===');
  const state = manager.getState();
  console.log(`对话条数: ${state.dialogueHistory.length}`);
  console.log(`LLM 消息条数: ${state.llmMessages.length}`);
  console.log(`玩家回合: ${state.playerTurnCount}`);

  console.log('\n=== 提交第二轮 ===');
  await manager.submitPlayerAction('太子具体在做什么？');

  console.log('\n场景引擎测试完成');
  console.log('完整对话历史:');
  manager.getState().dialogueHistory.forEach((d) => {
    const prefix =
      d.type === 'narrator'
        ? '[旁白]'
        : d.type === 'player'
          ? '[玩家]'
          : d.type === 'scene_action'
            ? '[动作]'
            : `[${d.speakerName}]`;
    console.log(
      `  ${prefix} ${d.content.slice(0, 80)}${d.content.length > 80 ? '...' : ''}`,
    );
  });
}
