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
      className="px-4 py-1.5"
      style={{
        background: 'linear-gradient(90deg, rgba(20, 14, 8, 0.9) 0%, rgba(25, 18, 12, 0.9) 50%, rgba(20, 14, 8, 0.9) 100%)',
        borderBottom: '1px solid rgba(139, 90, 43, 0.15)',
      }}
    >
      <div className="flex items-center gap-6">
        <span className="font-game text-xs shrink-0" style={{ color: '#b0a080' }}>
          {formatCalendar(state.calendar)}
        </span>

        <div className="flex-1 grid grid-cols-3 gap-x-5 gap-y-0.5">
          {DISPLAY_AXES.map((axisId) => {
            const axis = state.pressureAxes[axisId];
            if (!axis) return null;
            const label = PRESSURE_AXIS_LABELS[axisId];
            const level = getPressureLabel(axis.value);
            const color = getPressureColor(axis.value);
            const width = getPressureWidth(axis.value);

            return (
              <div key={axisId} className="flex items-center gap-1.5">
                <span
                  className="text-xs shrink-0"
                  style={{ color: '#6a6050', width: '3.5rem', fontSize: '0.65rem' }}
                >
                  {label}
                </span>
                <div
                  className="flex-1 h-1 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'rgba(232, 224, 208, 0.04)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${width}%`, backgroundColor: color }}
                  />
                </div>
                <span
                  className="text-xs shrink-0"
                  style={{ color, width: '1.5rem', textAlign: 'right', fontSize: '0.6rem' }}
                >
                  {level}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
