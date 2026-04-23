import { useState, useCallback, useMemo, useEffect } from 'react';
import type { WorldState, DailyActivity, TimeOfDay, ActivityCategory } from '../types/world';
import type { DeskCanvasState, DeskObjectState } from '../renderer/GameCanvasContext';
import { getActivitiesForTimeSlot } from '../engine/world/activities';
import WorldStateHud from './WorldStateHud';
import ImperialDesk from './desk/ImperialDesk';
import DeskObject from './desk/DeskObject';
import FlavorTextOverlay from './desk/FlavorTextOverlay';

interface DailyActivityScreenProps {
  state: WorldState;
  onSelectActivity: (activity: DailyActivity) => string;
  onEndDay: () => void;
  onDeskStateChange?: (deskState: DeskCanvasState) => void;
}

const TIME_SLOTS: { key: 'morning' | 'afternoon' | 'evening'; label: string; icon: string }[] = [
  { key: 'morning', label: '晨', icon: '☀' },
  { key: 'afternoon', label: '午', icon: '◑' },
  { key: 'evening', label: '夜', icon: '☽' },
];

function getTimeSlotIndex(timeOfDay: TimeOfDay): number {
  if (timeOfDay === 'morning') return 0;
  if (timeOfDay === 'afternoon') return 1;
  return 2;
}

function groupByCategory(activities: DailyActivity[]): Record<string, DailyActivity[]> {
  const groups: Record<string, DailyActivity[]> = {};
  for (const a of activities) {
    if (!groups[a.category]) groups[a.category] = [];
    groups[a.category].push(a);
  }
  return groups;
}

export default function DailyActivityScreen({
  state,
  onSelectActivity,
  onEndDay,
  onDeskStateChange,
}: DailyActivityScreenProps) {
  const [currentSlotIndex, setCurrentSlotIndex] = useState(
    () => getTimeSlotIndex(state.calendar.timeOfDay),
  );
  const [selectedActivities, setSelectedActivities] = useState<Record<string, string>>({});
  const [flavorText, setFlavorText] = useState<string | null>(null);
  const [focusedCategory, setFocusedCategory] = useState<ActivityCategory | null>(null);

  const currentSlot = TIME_SLOTS[currentSlotIndex];
  const availableActivities = getActivitiesForTimeSlot(currentSlot.key);
  const grouped = useMemo(() => groupByCategory(availableActivities), [availableActivities]);

  const handleSelectActivity = useCallback((activity: DailyActivity) => {
    const text = onSelectActivity(activity);
    setFlavorText(text);
    setFocusedCategory(null);
    setSelectedActivities((prev) => ({ ...prev, [currentSlot.key]: activity.id }));

    setTimeout(() => {
      setFlavorText(null);
      setCurrentSlotIndex((prev) => prev < TIME_SLOTS.length - 1 ? prev + 1 : prev);
    }, 3000);
  }, [currentSlot.key, onSelectActivity]);

  const allSlotsFilled = TIME_SLOTS.every((slot) => selectedActivities[slot.key]);

  const categoriesKey = Object.keys(grouped).join(',');
  useEffect(() => {
    if (!onDeskStateChange) return;
    const cats = Object.keys(grouped) as ActivityCategory[];
    const objects: DeskObjectState[] = cats.map((cat) => ({
      category: cat,
      isFocused: focusedCategory === cat,
      isDimmed: focusedCategory !== null && focusedCategory !== cat,
    }));
    onDeskStateChange({ timeSlot: currentSlot.key, objects });
  }, [currentSlot.key, focusedCategory, categoriesKey, onDeskStateChange, grouped]);

  return (
    <div className="h-screen relative flex flex-col">
      <div className="relative z-10">
        <WorldStateHud state={state} />
      </div>

      {/* 时间段墨印指示器 */}
      <div className="desk-time-bar relative z-10">
        {TIME_SLOTS.map((slot, idx) => {
          const done = !!selectedActivities[slot.key];
          const active = idx === currentSlotIndex;
          return (
            <div
              key={slot.key}
              className={`desk-time-stamp ${active ? 'desk-time-stamp--active' : ''} ${done ? 'desk-time-stamp--done' : ''}`}
            >
              <span className="desk-time-icon">{slot.icon}</span>
              <span className="desk-time-label">{slot.label}</span>
              {done && <span className="desk-time-check">✓</span>}
            </div>
          );
        })}
      </div>

      {/* 案台主体 */}
      <div className="flex-1 relative z-10 flex items-center justify-center">
        <ImperialDesk
          timeSlot={currentSlot.key}
          onClickBackground={() => setFocusedCategory(null)}
        >
          {flavorText ? (
            <FlavorTextOverlay text={flavorText} />
          ) : (
            Object.entries(grouped).map(([cat, acts]) => (
              <DeskObject
                key={cat}
                category={cat as ActivityCategory}
                activities={acts}
                isFocused={focusedCategory === cat}
                isDimmed={focusedCategory !== null && focusedCategory !== cat}
                onClickObject={() => setFocusedCategory(cat as ActivityCategory)}
                onSelectActivity={handleSelectActivity}
              />
            ))
          )}
        </ImperialDesk>
      </div>

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
