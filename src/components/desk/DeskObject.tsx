import type { DailyActivity, ActivityCategory } from '../../types/world';

const CATEGORY_COLORS: Record<string, string> = {
  governance: '#6B8FBF',
  military: '#BF6B6B',
  intelligence: '#8B6BBF',
  social: '#6BBF8F',
  personal: '#B8A060',
};

interface DeskObjectLayout {
  left: string;
  top: string;
  width: number;
  height: number;
}

const DESK_LAYOUTS: Record<string, DeskObjectLayout> = {
  governance:    { left: '8%',  top: '10%',  width: 72, height: 100 },
  military:      { left: '10%', top: '62%',  width: 68, height: 72 },
  intelligence:  { left: '76%', top: '12%',  width: 76, height: 56 },
  social:        { left: '72%', top: '52%',  width: 88, height: 60 },
  personal:      { left: '55%', top: '70%',  width: 64, height: 64 },
};

interface DeskObjectProps {
  category: ActivityCategory;
  activities: DailyActivity[];
  isFocused: boolean;
  isDimmed: boolean;
  onClickObject: () => void;
  onSelectActivity: (activity: DailyActivity) => void;
}

export default function DeskObject({
  category,
  activities,
  isFocused,
  isDimmed,
  onClickObject,
  onSelectActivity,
}: DeskObjectProps) {
  const layout = DESK_LAYOUTS[category];
  const color = CATEGORY_COLORS[category];
  if (!layout) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: isFocused ? '50%' : layout.left,
        top: isFocused ? '50%' : layout.top,
        width: layout.width,
        height: layout.height,
        transform: isFocused ? 'translate(-50%, -50%)' : undefined,
        opacity: isDimmed ? 0 : 1,
        zIndex: isFocused ? 20 : 5,
        transition: 'all 0.5s ease',
        pointerEvents: isDimmed ? 'none' : 'auto',
      }}
    >
      {/* Invisible click target aligned with Canvas sprite */}
      {!isFocused && (
        <button
          onClick={(e) => { e.stopPropagation(); onClickObject(); }}
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        />
      )}

      {isFocused && (
        <div className="desk-activity-cards">
          {activities.map((activity, i) => (
            <button
              key={activity.id}
              className="desk-activity-card"
              onClick={(e) => {
                e.stopPropagation();
                onSelectActivity(activity);
              }}
              style={{
                '--card-delay': `${i * 0.08}s`,
                borderColor: color + '30',
              } as React.CSSProperties}
            >
              <span className="desk-card-name">{activity.name}</span>
              <span className="desk-card-desc">{activity.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
