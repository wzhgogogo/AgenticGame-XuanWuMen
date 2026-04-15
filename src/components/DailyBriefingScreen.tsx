import type { WorldState, WorldTickResult } from '../types/world';
import WorldStateHud from './WorldStateHud';

interface DailyBriefingScreenProps {
  state: WorldState;
  tickResult: WorldTickResult;
  hasEvents: boolean;
  onProceed: () => void;
}

export default function DailyBriefingScreen({
  state,
  tickResult,
  hasEvents,
  onProceed,
}: DailyBriefingScreenProps) {
  const lines = tickResult.dailyBriefing.split('\n');

  return (
    <div className="h-screen flex flex-col">
      <WorldStateHud state={state} />

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full animate-fade-in">
          {/* 日报内容 */}
          <div className="mb-8">
            {lines.map((line, i) => {
              if (!line.trim()) return <div key={i} className="h-3" />;

              // 标题行（带【】）
              if (line.startsWith('【')) {
                return (
                  <p
                    key={i}
                    className="font-game text-base mb-4 text-center"
                    style={{ color: '#e8e0d0' }}
                  >
                    {line}
                  </p>
                );
              }

              // 紧急事态提示
              if (line.includes('紧急事态')) {
                return (
                  <p
                    key={i}
                    className="text-sm mt-4 mb-2"
                    style={{ color: '#E24B4A' }}
                  >
                    {line}
                  </p>
                );
              }

              // 普通内容
              return (
                <p
                  key={i}
                  className="text-sm leading-relaxed mb-1"
                  style={{ color: line.startsWith('·') ? '#c0b8a0' : '#8a8070' }}
                >
                  {line}
                </p>
              );
            })}
          </div>

          {/* NPC 行动摘要 */}
          {tickResult.npcActions.length > 0 && (
            <div
              className="mb-6 px-3 py-2 rounded-sm"
              style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a34' }}
            >
              <p className="text-xs mb-2" style={{ color: '#8a8070' }}>
                府中动态
              </p>
              {tickResult.npcActions.map((action, i) => (
                <p key={i} className="text-xs mb-1" style={{ color: '#c0b8a0' }}>
                  {action.narrativeHook || action.description}
                </p>
              ))}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-center">
            <button
              onClick={onProceed}
              className="px-8 py-2.5 rounded-sm text-sm font-ui cursor-pointer transition-colors"
              style={{
                backgroundColor: hasEvents ? '#3a2020' : '#2a2a34',
                color: '#e8e0d0',
                border: hasEvents ? '1px solid #E24B4A40' : 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = hasEvents ? '#4a2828' : '#3a3a44';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = hasEvents ? '#3a2020' : '#2a2a34';
              }}
            >
              {hasEvents ? '处理事态' : '翌日'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
