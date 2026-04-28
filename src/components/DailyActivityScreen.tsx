import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { WorldState, DailyActivity, TimeOfDay, ActivityCategory } from '../types/world';
import type { DeskCanvasState, DeskObjectState } from '../renderer/GameCanvasContext';
import { getActivitiesForTimeSlot } from '../engine/world/activities';
import WorldStateHud from './WorldStateHud';
import DeskLayout, { ChangAnMap, TimeSlotTablet } from './desk/DeskLayout';
import DeskObject from './desk/DeskObject';
import FlavorTextOverlay from './desk/FlavorTextOverlay';

interface DailyActivityScreenProps {
  state: WorldState;
  onSelectActivity: (activity: DailyActivity) => string;
  onEndDay: () => void;
  onFastForward?: (days: number) => void;
  onDeskStateChange?: (deskState: DeskCanvasState) => void;
}

const TIME_SLOTS: { key: 'morning' | 'afternoon' | 'evening'; label: string; tabletLabel: string }[] = [
  { key: 'morning', label: '晨', tabletLabel: '晨时' },
  { key: 'afternoon', label: '午', tabletLabel: '午时' },
  { key: 'evening', label: '夜', tabletLabel: '夜时' },
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

const fastForwardButtonStyle: React.CSSProperties = {
  padding: '10px 24px',
  background: 'linear-gradient(180deg, #2a1f12 0%, #15100a 100%)',
  border: '1px solid rgba(139,100,50,0.45)',
  borderRadius: 2,
  color: '#c9a84c',
  fontFamily: 'Noto Serif SC, serif',
  fontSize: 13,
  letterSpacing: '0.15em',
  cursor: 'pointer',
  boxShadow: 'inset 0 1px 0 rgba(232,200,150,0.06)',
};

export default function DailyActivityScreen({
  state,
  onSelectActivity,
  onEndDay,
  onFastForward,
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
    <DeskLayout
      timeSlot={currentSlot.key}
      state={state}
      hudSlot={<WorldStateHud state={state} />}
      activityPanel={
        <ActivityPanelShell timeLabel={currentSlot.tabletLabel}>
          {Object.entries(grouped).map(([cat, acts]) => (
            <ActivityCategoryGroup
              key={cat}
              category={cat as ActivityCategory}
              activities={acts}
              selected={selectedActivities[currentSlot.key]}
              onSelect={handleSelectActivity}
            />
          ))}
        </ActivityPanelShell>
      }
      centerContent={
        <div style={{ position: 'relative', width: '100%', height: '100%' }} onClick={() => setFocusedCategory(null)}>
          <ChangAnMap />
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
        </div>
      }
      timeSlotBar={
        <>
          {TIME_SLOTS.map((slot, idx) => {
            const done = !!selectedActivities[slot.key];
            return (
              <TimeSlotTablet
                key={slot.key}
                label={`${slot.tabletLabel}${done ? ' ✓' : ''}`}
                active={idx === currentSlotIndex}
                onClick={() => {}}
              />
            );
          })}
        </>
      }
      endDayButton={
        allSlotsFilled && !flavorText ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={onEndDay}
              style={{
                padding: '10px 40px',
                background: 'linear-gradient(180deg, #3a2818 0%, #1a0f08 100%)',
                border: '1px solid rgba(201,168,76,0.6)',
                borderRadius: 2,
                color: '#e8d4a8',
                fontFamily: 'Noto Serif SC, serif',
                fontSize: 14,
                letterSpacing: '0.2em',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(201,168,76,0.2), inset 0 1px 0 rgba(232,200,150,0.1)',
              }}
            >
              结束今日
            </button>
            {onFastForward && (
              <>
                <button
                  onClick={() => onFastForward(3)}
                  style={fastForwardButtonStyle}
                  title="若期间触发事件或到达终局，将自动停下"
                >
                  快进 3 日
                </button>
                <button
                  onClick={() => onFastForward(7)}
                  style={fastForwardButtonStyle}
                  title="若期间触发事件或到达终局，将自动停下"
                >
                  快进 7 日
                </button>
              </>
            )}
          </div>
        ) : <></>
      }
    />
  );
}

/* ---- Activity panel shell (demo visual style) ---- */

function ActivityPanelShell({ timeLabel, children }: { timeLabel: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '14px 14px 16px',
        background: 'linear-gradient(180deg, rgba(22,14,8,0.92) 0%, rgba(14,8,4,0.95) 100%)',
        border: '1px solid rgba(139,100,50,0.25)',
        borderTop: '2px solid rgba(180,130,70,0.3)',
        borderRadius: 4,
        boxShadow: '0 6px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(232,224,208,0.04)',
      }}
    >
      <div style={{ fontFamily: 'Noto Serif SC, serif', fontSize: 13, color: '#d4b878', letterSpacing: '0.1em', marginBottom: 12 }}>
        选择今日活动（{timeLabel}）
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children}
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  governance: '治政',
  military: '军务',
  intelligence: '情报',
  social: '社交',
  personal: '个人',
};

const CATEGORY_ICONS: Record<string, string> = {
  governance: '/images/icon-governance.png',
  military: '/images/icon-military.png',
  intelligence: '/images/icon-intelligence.png',
  social: '/images/icon-social.png',
  personal: '/images/icon-personal.png',
};

function ActivityCategoryGroup({
  category,
  activities,
  selected,
  onSelect,
}: {
  category: ActivityCategory;
  activities: DailyActivity[];
  selected?: string;
  onSelect: (a: DailyActivity) => void;
}) {
  const label = CATEGORY_LABELS[category] || category;
  const icon = CATEGORY_ICONS[category];
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 10, color: '#8a7050', fontFamily: 'Noto Serif SC, serif', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <img src={icon} alt={label} style={{ width: 20, height: 20 }} />}
        {label}
      </div>
      {activities.map((a) => {
        const isSelected = selected === a.id;
        return (
          <button
            key={a.id}
            onClick={() => !isSelected && onSelect(a)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '6px 10px',
              marginBottom: 2,
              background: isSelected ? 'rgba(201,168,76,0.12)' : 'transparent',
              border: `1px solid ${isSelected ? 'rgba(201,168,76,0.3)' : 'transparent'}`,
              borderRadius: 2,
              color: isSelected ? '#c9a84c' : '#c0b8a0',
              fontSize: 12,
              fontFamily: 'Noto Serif SC, serif',
              cursor: isSelected ? 'default' : 'pointer',
              opacity: isSelected ? 0.6 : 1,
            }}
          >
            {a.name}
            <span style={{ fontSize: 10, color: '#8a7050', marginLeft: 8 }}>{a.description}</span>
          </button>
        );
      })}
    </div>
  );
}
