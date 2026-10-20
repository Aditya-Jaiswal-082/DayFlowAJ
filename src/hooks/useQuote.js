import { useMemo } from "react";
import { HOLIDAY_QUOTES, QUOTES, WEEKEND_QUOTES } from "../lib/constants.js";
import { dayOfWeek, isWeekendKey } from "../lib/dates.js";

/**
 * One quote for the day being viewed — a holiday pool takes over on a day
 * marked as one, a weekend pool on a Saturday or Sunday, otherwise the usual
 * rotation. Deterministic per day, so it doesn't jitter on every render.
 */
export function useQuote(dayKey, isHoliday) {
  return useMemo(() => {
    if (!dayKey) return QUOTES[new Date().getDay() % QUOTES.length];
    const pool = isHoliday ? HOLIDAY_QUOTES : isWeekendKey(dayKey) ? WEEKEND_QUOTES : QUOTES;
    return pool[dayOfWeek(dayKey) % pool.length];
  }, [dayKey, isHoliday]);
}
