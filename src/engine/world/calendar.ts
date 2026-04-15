import type { CalendarState, TimeOfDay } from '../../types/world';

// 唐代采用的是农历，每月天数不固定。简化处理：
// 大月30天（正月、三月、五月、七月、八月、十月、十二月）
// 小月29天（二月、四月、六月、九月、十一月）
const DAYS_IN_MONTH: Record<number, number> = {
  1: 30, 2: 29, 3: 30, 4: 29, 5: 30, 6: 29,
  7: 30, 8: 30, 9: 29, 10: 30, 11: 29, 12: 30,
};

// 中文月份名
const MONTH_NAMES: Record<number, string> = {
  1: '正月', 2: '二月', 3: '三月', 4: '四月', 5: '五月', 6: '六月',
  7: '七月', 8: '八月', 9: '九月', 10: '十月', 11: '十一月', 12: '十二月',
};

// 中文日字
function chineseDayName(day: number): string {
  if (day === 10) return '初十';
  if (day === 20) return '二十';
  if (day === 30) return '三十';

  const units = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  if (day < 10) {
    return '初' + units[day];
  } else if (day < 20) {
    return '十' + units[day - 10];
  } else {
    // 21-29
    return '廿' + units[day - 20];
  }
}

const TIME_OF_DAY_NAMES: Record<TimeOfDay, string> = {
  morning: '辰时',
  afternoon: '午时',
  evening: '酉时',
  night: '亥时',
};

// ===== 创建日历 =====

export function createCalendar(month: number = 1, day: number = 1): CalendarState {
  return {
    year: 626,
    month,
    day,
    timeOfDay: 'morning',
    daysSinceStart: 0,
  };
}

// ===== 推进时间 =====

/** 推进到下一个时间段 */
export function advanceTimeOfDay(cal: CalendarState): CalendarState {
  const order: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night'];
  const idx = order.indexOf(cal.timeOfDay);

  if (idx < order.length - 1) {
    return { ...cal, timeOfDay: order[idx + 1] };
  }

  // night → 下一天 morning
  return advanceDay(cal);
}

/** 推进到下一天（morning） */
export function advanceDay(cal: CalendarState): CalendarState {
  let { month, day } = cal;
  const daysInCurrentMonth = DAYS_IN_MONTH[month] ?? 30;

  day += 1;
  if (day > daysInCurrentMonth) {
    day = 1;
    month += 1;
    // 游戏不太可能跨年，但以防万一
    if (month > 12) {
      month = 1;
    }
  }

  return {
    ...cal,
    month,
    day,
    timeOfDay: 'morning',
    daysSinceStart: cal.daysSinceStart + 1,
  };
}

// ===== 格式化显示 =====

/** 返回如 "武德九年 正月初三 辰时" */
export function formatCalendar(cal: CalendarState): string {
  return `武德九年 ${MONTH_NAMES[cal.month]}${chineseDayName(cal.day)} ${TIME_OF_DAY_NAMES[cal.timeOfDay]}`;
}

/** 返回如 "武德九年正月初三" （不含时辰） */
export function formatDate(cal: CalendarState): string {
  return `武德九年${MONTH_NAMES[cal.month]}${chineseDayName(cal.day)}`;
}

/** 返回如 "正月" */
export function formatMonth(cal: CalendarState): string {
  return MONTH_NAMES[cal.month] ?? `${cal.month}月`;
}

// ===== 判断工具 =====

/** 是否超过某个日期（用于游戏结束判断等） */
export function isAfterDate(cal: CalendarState, month: number, day: number): boolean {
  if (cal.month > month) return true;
  if (cal.month === month && cal.day > day) return true;
  return false;
}

/** 获取当月天数 */
export function getDaysInMonth(month: number): number {
  return DAYS_IN_MONTH[month] ?? 30;
}
