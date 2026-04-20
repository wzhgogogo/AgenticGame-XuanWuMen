import { useState, useCallback } from 'react';
import type { WorldState, DailyActivity, TimeOfDay } from '../types/world';
import { getActivitiesForTimeSlot } from '../engine/world/activities';
import WorldStateHud from './WorldStateHud';
import SceneBackground from './SceneBackground';

interface DailyActivityScreenProps {
  state: WorldState;
  onSelectActivity: (activity: DailyActivity) => string;
  onEndDay: () => void;
}

const TIME_SLOTS: { key: 'morning' | 'afternoon' | 'evening'; label: string; icon: string }[] = [
  { key: 'morning', label: '晨', icon: '☀' },
  { key: 'afternoon', label: '午', icon: '◑' },
  { key: 'evening', label: '夜', icon: '☽' },
];

const CATEGORY_LABELS: Record<string, string> = {
  governance: '治政',
  military: '军务',
  intelligence: '情报',
  social: '社交',
  personal: '个人',
};

const CATEGORY_COLORS: Record<string, string> = {
  governance: '#6B8FBF',
  military: '#BF6B6B',
  intelligence: '#8B6BBF',
  social: '#6BBF8F',
  personal: '#B8A060',
};

function getTimeSlotIndex(timeOfDay: TimeOfDay): number {
  if (timeOfDay === 'morning') return 0;
  if (timeOfDay === 'afternoon') return 1;
  return 2;
}

export default function DailyActivityScreen({
  state,
  onSelectActivity,
  onEndDay,
}: DailyActivityScreenProps) {
  const [currentSlotIndex, setCurrentSlotIndex] = useState(
    () => getTimeSlotIndex(state.calendar.timeOfDay),
  );
  const [selectedActivities, setSelectedActivities] = useState<Record<string, string>>({});
  const [flavorText, setFlavorText] = useState<string | null>(null);

  const currentSlot = TIME_SLOTS[currentSlotIndex];
  const availableActivities = getActivitiesForTimeSlot(currentSlot.key);

  const handleSelectActivity = useCallback((activity: DailyActivity) => {
    const text = onSelectActivity(activity);
    setFlavorText(text);
    setSelectedActivities((prev) => ({ ...prev, [currentSlot.key]: activity.id }));

    setTimeout(() => {
      setFlavorText(null);
      setCurrentSlotIndex((prev) => prev < TIME_SLOTS.length - 1 ? prev + 1 : prev);
    }, 3000);
  }, [currentSlot.key, onSelectActivity]);

  const allSlotsFilled = TIME_SLOTS.every((slot) => selectedActivities[slot.key]);

  return (
    <div className="h-screen relative flex flex-col">
      <SceneBackground />
      <div className="relative z-10">
        <WorldStateHud state={state} />
      </div>

      {/* 时间段指示器 */}
      <div
        className="relative z-10 flex items-center justify-center gap-6 py-3"
        style={{ borderBottom: '1px solid rgba(201, 168, 76, 0.1)' }}
      >
        {TIME_SLOTS.map((slot, idx) => {
          const done = !!selectedActivities[slot.key];
          const active = idx === currentSlotIndex;
          return (
            <div
              key={slot.key}
              className="flex items-center gap-1.5 text-sm"
              style={{
                color: active ? '#e8e0d0' : done ? '#606058' : '#4a4a50',
                opacity: active ? 1 : 0.7,
              }}
            >
              <span>{slot.icon}</span>
              <span className={active ? 'font-game' : ''}>{slot.label}</span>
              {done && <span style={{ color: '#c9a84c' }}>&#10003;</span>}
            </div>
          );
        })}
      </div>

      {/* 风味文本显示 */}
      {flavorText ? (
        <div className="flex-1 relative z-10 flex items-center justify-center px-8">
          <p
            className="font-game text-sm leading-relaxed text-center max-w-md animate-fade-in"
            style={{ color: '#c0b8a0' }}
          >
            {flavorText}
          </p>
        </div>
      ) : (
        /* 活动选择区域 */
        <div className="flex-1 relative z-10 overflow-y-auto px-4 py-4">
          <div className="max-w-lg mx-auto">
            <p className="text-xs mb-4" style={{ color: '#8a8070' }}>
              {currentSlot.icon} {currentSlot.label}间 — 选择今日{currentSlot.label}间的安排
            </p>

            <div className="flex flex-col gap-2">
              {availableActivities.map((activity) => {
                const catColor = CATEGORY_COLORS[activity.category] || '#8a8070';
                return (
                  <button
                    key={activity.id}
                    onClick={() => handleSelectActivity(activity)}
                    className="w-full text-left px-4 py-3 rounded cursor-pointer"
                    style={{
                      backgroundColor: 'rgba(20, 20, 30, 0.6)',
                      border: '1px solid rgba(201, 168, 76, 0.1)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = catColor + '60';
                      e.currentTarget.style.backgroundColor = 'rgba(30, 28, 40, 0.8)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.1)';
                      e.currentTarget.style.backgroundColor = 'rgba(20, 20, 30, 0.6)';
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-sm"
                        style={{ backgroundColor: catColor + '20', color: catColor }}
                      >
                        {CATEGORY_LABELS[activity.category]}
                      </span>
                      <span className="text-sm font-game" style={{ color: '#e8e0d0' }}>
                        {activity.name}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: '#8a8070' }}>
                      {activity.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 结束今日按钮 */}
      {allSlotsFilled && !flavorText && (
        <div className="relative z-10 px-4 py-4 flex justify-center" style={{ borderTop: '1px solid rgba(201, 168, 76, 0.1)' }}>
          <button
            onClick={onEndDay}
            className="px-10 py-2.5 rounded text-sm font-ui cursor-pointer"
            style={{
              backgroundColor: 'transparent',
              color: '#e8e0d0',
              border: '1px solid rgba(201, 168, 76, 0.4)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.7)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(201, 168, 76, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.4)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            结束今日
          </button>
        </div>
      )}
    </div>
  );
}
