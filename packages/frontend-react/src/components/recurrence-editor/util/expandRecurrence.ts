import type { ExpandRecurrenceResult, RecurrenceRule } from "./recurrenceRule";

export const MAX_OCCURRENCES = 1000;

const MAX_MONTHLY_CYCLE_ATTEMPTS = MAX_OCCURRENCES * 12;

type AddResult = "added" | "ended" | "overflow";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseDateUTC(yyyyMmDd: string): Date {
  if (!DATE_REGEX.test(yyyyMmDd)) {
    throw new Error(`Invalid date string: ${yyyyMmDd}`);
  }
  const [y, m, d] = yyyyMmDd.split("-").map((p) => parseInt(p, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function weekStartUTC(date: Date): Date {
  return addDaysUTC(date, -date.getUTCDay());
}

function nthWeekdayOfMonth(date: Date): number {
  return Math.floor((date.getUTCDate() - 1) / 7) + 1;
}

function getDateForNthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  nth: number,
): Date | null {
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const offset = (weekday - firstOfMonth.getUTCDay() + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  if (day > daysInMonth(year, monthIndex)) return null;
  return new Date(Date.UTC(year, monthIndex, day));
}

export function expandRecurrence(
  baseDateStr: string,
  rule: RecurrenceRule,
): ExpandRecurrenceResult {
  const baseDate = parseDateUTC(baseDateStr);

  if (rule.interval < 1 || !Number.isInteger(rule.interval)) {
    throw new Error("Recurrence interval must be a positive integer");
  }

  const endDate =
    rule.ends.type === "onDate" ? parseDateUTC(rule.ends.date) : null;
  const userCap =
    rule.ends.type === "afterOccurrences" ? rule.ends.count : Infinity;

  const dates: string[] = [];

  const tryAdd = (candidate: Date): AddResult => {
    if (endDate && candidate.getTime() > endDate.getTime()) return "ended";
    if (dates.length >= userCap) return "ended";
    if (dates.length >= MAX_OCCURRENCES) return "overflow";
    dates.push(formatDateUTC(candidate));
    return "added";
  };

  const expandDaily = (): AddResult => {
    for (let occurrence = 0; ; occurrence += 1) {
      const result = tryAdd(addDaysUTC(baseDate, occurrence * rule.interval));
      if (result !== "added") return result;
    }
  };

  const expandWeekly = (): AddResult => {
    const baseWeekday = baseDate.getUTCDay();
    const selectedWeekdays =
      rule.weekDays && rule.weekDays.length > 0
        ? Array.from(new Set([...rule.weekDays, baseWeekday])).sort(
            (a, b) => a - b,
          )
        : [baseWeekday];
    const baseWeekStart = weekStartUTC(baseDate);

    for (let weekCycle = 0; ; weekCycle += 1) {
      const weekStart = addDaysUTC(
        baseWeekStart,
        weekCycle * rule.interval * 7,
      );
      for (const weekday of selectedWeekdays) {
        const candidate = addDaysUTC(weekStart, weekday);
        if (candidate.getTime() < baseDate.getTime()) continue;
        const result = tryAdd(candidate);
        if (result !== "added") return result;
      }
    }
  };

  const expandMonthly = (): AddResult => {
    const pattern = rule.monthlyPattern ?? "dayOfMonth";
    const baseYear = baseDate.getUTCFullYear();
    const baseMonth = baseDate.getUTCMonth();
    const baseDay = baseDate.getUTCDate();
    const baseWeekday = baseDate.getUTCDay();
    const baseNth = nthWeekdayOfMonth(baseDate);

    for (let cycle = 0; cycle < MAX_MONTHLY_CYCLE_ATTEMPTS; cycle += 1) {
      const totalMonths = baseMonth + cycle * rule.interval;
      const year = baseYear + Math.floor(totalMonths / 12);
      const monthIndex = totalMonths % 12;

      const candidate =
        pattern === "dayOfMonth"
          ? baseDay <= daysInMonth(year, monthIndex)
            ? new Date(Date.UTC(year, monthIndex, baseDay))
            : null
          : getDateForNthWeekdayOfMonth(year, monthIndex, baseWeekday, baseNth);

      if (candidate) {
        const result = tryAdd(candidate);
        if (result !== "added") return result;
      } else if (endDate) {
        const firstOfNextCycle = new Date(Date.UTC(year, monthIndex + 1, 1));
        if (firstOfNextCycle.getTime() > endDate.getTime()) return "ended";
      }
    }
    return "added";
  };

  let finalResult: AddResult;
  if (rule.frequency === "daily") finalResult = expandDaily();
  else if (rule.frequency === "weekly") finalResult = expandWeekly();
  else if (rule.frequency === "monthly") finalResult = expandMonthly();
  else throw new Error(`Unsupported frequency: ${rule.frequency}`);

  return { dates, truncated: finalResult !== "ended" };
}
