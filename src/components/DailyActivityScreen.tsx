import { useState, useCallback } from 'react';
import type { WorldState, DailyActivity, TimeOfDay } from '../types/world';
import { getActivitiesForTimeSlot } from '../engine/world/activities';
import WorldStateHud from './WorldStateHud';

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

    // 延迟后自动推进到下一个时段
    setTimeout(() => {
      setFlavorText(null);
      setCurrentSlotIndex((prev) => prev < TIME_SLOTS.length - 1 ? prev + 1 : prev);
    }, 3000);
  }, [currentSlot.key, onSelectActivity]);

  const allSlotsFilled = TIME_SLOTS.every((slot) => selectedActivities[slot.key]);

  return (
    <div className="h-screen flex flex-col">
      <WorldStateHud state={state} />

      {/* 时间段指示器 */}
      <div
        className="flex items-center justify-center gap-6 py-3"
        style={{ borderBottom: '1px solid #2a2a34' }}
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
              {done && <span style={{ color: '#6BBF8F' }}>&#10003;</span>}
            </div>
          );
        })}
      </div>

      {/* 风味文本显示 */}
      {flavorText ? (
        <div className="flex-1 flex items-center justify-center px-8">
          <p
            className="font-game text-sm leading-relaxed text-center max-w-md animate-fade-in"
            style={{ color: '#c0b8a0' }}
          >
            {flavorText}
          </p>
        </div>
      ) : (
        /* 活动选择区域 */
        <div className="flex-1 overflow-y-auto px-4 py-4">
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
                    className="w-full text-left px-4 py-3 rounded-sm cursor-pointer transition-colors"
                    style={{
                      backgroundColor: '#1a1a24',
                      border: '1px solid #2a2a34',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = catColor;
                      e.currentTarget.style.backgroundColor = '#1e1e28';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#2a2a34';
                      e.currentTarget.style.backgroundColor = '#1a1a24';
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
        <div className="px-4 py-4 flex justify-center" style={{ borderTop: '1px solid #2a2a34' }}>
          <button
            onClick={onEndDay}
            className="px-8 py-2.5 rounded-sm text-sm font-ui cursor-pointer transition-colors"
            style={{ backgroundColor: '#2a2a34', color: '#e8e0d0' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3a3a44'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2a2a34'; }}
          >
            结束今日
          </button>
        </div>
      )}
    </div>
  );
}
