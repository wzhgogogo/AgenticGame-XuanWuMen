import type { WorldState, PressureAxisId } from '../types/world';
import { PRESSURE_AXIS_LABELS, getPressureLabel } from '../engine/world/worldState';
import { formatCalendar } from '../engine/world/calendar';

interface WorldStateHudProps {
  state: WorldState;
}

/** 压力等级颜色映射 */
function getPressureColor(value: number): string {
  if (value >= 80) return '#E24B4A';
  if (value >= 60) return '#D4924B';
  if (value >= 40) return '#B8A060';
  if (value >= 20) return '#8a8070';
  return '#606058';
}

/** 压力条宽度（百分比） */
function getPressureWidth(value: number): number {
  return Math.max(4, Math.min(100, value));
}

const DISPLAY_AXES: PressureAxisId[] = [
  'succession_crisis',
  'jiancheng_hostility',
  'court_opinion',
  'qinwangfu_desperation',
  'imperial_suspicion',
  'military_readiness',
];

export default function WorldStateHud({ state }: WorldStateHudProps) {
  return (
    <div
      className="px-4 py-3"
      style={{ backgroundColor: '#12121a', borderBottom: '1px solid #2a2a34' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-game text-sm" style={{ color: '#e8e0d0' }}>
          {formatCalendar(state.calendar)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {DISPLAY_AXES.map((axisId) => {
          const axis = state.pressureAxes[axisId];
          if (!axis) return null;
          const label = PRESSURE_AXIS_LABELS[axisId];
          const level = getPressureLabel(axis.value);
          const color = getPressureColor(axis.value);
          const width = getPressureWidth(axis.value);

          return (
            <div key={axisId} className="flex items-center gap-2">
              <span
                className="text-xs shrink-0"
                style={{ color: '#8a8070', width: '4.5rem' }}
              >
                {label}
              </span>
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: '#1a1a24' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${width}%`, backgroundColor: color }}
                />
              </div>
              <span
                className="text-xs shrink-0"
                style={{ color, width: '2rem', textAlign: 'right' }}
              >
                {level}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
