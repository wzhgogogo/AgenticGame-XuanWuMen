import type { DailyActivity, ActivityCategory } from '../../types/world';

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

const OBJECT_LABELS: Record<string, string> = {
  governance: '奏折',
  military: '兵符',
  intelligence: '密信',
  social: '请帖',
  personal: '书卷',
};

interface DeskObjectLayout {
  left: string;
  top: string;
  rotate: number;
  width: number;
  height: number;
}

const DESK_LAYOUTS: Record<string, DeskObjectLayout> = {
  governance:    { left: '8%',  top: '10%',  rotate: -4,  width: 72, height: 100 },
  military:      { left: '10%', top: '62%',  rotate: 6,   width: 68, height: 72 },
  intelligence:  { left: '76%', top: '12%',  rotate: -7,  width: 76, height: 56 },
  social:        { left: '72%', top: '52%',  rotate: 3,   width: 88, height: 60 },
  personal:      { left: '55%', top: '70%',  rotate: -2,  width: 64, height: 64 },
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
  const label = CATEGORY_LABELS[category];
  const objectLabel = OBJECT_LABELS[category];

  if (!layout) return null;

  const categoryClass = `desk-object-${category}`;

  return (
    <div
      className="desk-object-wrapper"
      style={{
        position: 'absolute',
        left: isFocused ? '50%' : layout.left,
        top: isFocused ? '50%' : layout.top,
        transform: isFocused
          ? 'translate(-50%, -50%) rotate(0deg) scale(1.15)'
          : `rotate(${layout.rotate}deg)`,
        opacity: isDimmed ? 0.25 : 1,
        zIndex: isFocused ? 20 : 5,
        transition: 'all 0.5s ease',
        pointerEvents: isDimmed ? 'none' : 'auto',
      }}
    >
      <button
        className={`desk-object ${categoryClass}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isFocused) onClickObject();
        }}
        style={{
          width: layout.width,
          height: layout.height,
          cursor: isFocused ? 'default' : 'pointer',
          '--obj-color': color,
        } as React.CSSProperties}
      >
        <span className="desk-object-icon">{objectLabel}</span>
        <span className="desk-object-label" style={{ color }}>{label}</span>
        {activities.length > 1 && (
          <span className="desk-object-count">{activities.length}</span>
        )}
      </button>

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
