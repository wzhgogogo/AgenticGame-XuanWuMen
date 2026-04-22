import type { WorldState, WorldTickResult } from '../types/world';
import WorldStateHud from './WorldStateHud';
import SceneBackground from './SceneBackground';

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
    <div className="h-screen relative flex flex-col">
      <SceneBackground />
      <div className="relative z-10">
        <WorldStateHud state={state} />
      </div>

      <div className="flex-1 relative z-10 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          {/* 日报内容 */}
          <div className="document-panel rounded-lg px-6 py-5 mb-6 animate-fade-in">
            {lines.map((line, i) => {
              if (!line.trim()) return <div key={i} className="h-3" />;

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
              className="document-panel rounded-lg mb-6 px-4 py-3"
              style={{ borderLeft: '2px solid rgba(201, 168, 76, 0.2)' }}
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
              className="px-10 py-2.5 rounded text-sm font-ui cursor-pointer"
              style={{
                backgroundColor: 'transparent',
                color: '#e8e0d0',
                border: `1px solid ${hasEvents ? 'rgba(199, 62, 58, 0.4)' : 'rgba(201, 168, 76, 0.4)'}`,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = hasEvents ? 'rgba(199, 62, 58, 0.7)' : 'rgba(201, 168, 76, 0.7)';
                e.currentTarget.style.boxShadow = `0 0 20px ${hasEvents ? 'rgba(199, 62, 58, 0.1)' : 'rgba(201, 168, 76, 0.1)'}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = hasEvents ? 'rgba(199, 62, 58, 0.4)' : 'rgba(201, 168, 76, 0.4)';
                e.currentTarget.style.boxShadow = 'none';
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
