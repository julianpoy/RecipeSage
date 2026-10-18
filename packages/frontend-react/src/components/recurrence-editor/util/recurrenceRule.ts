export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export type MonthlyPattern = "dayOfMonth" | "weekdayOfMonth";

export type RecurrenceEnds =
  | { type: "onDate"; date: string }
  | { type: "afterOccurrences"; count: number };

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  weekDays?: number[];
  monthlyPattern?: MonthlyPattern;
  ends: RecurrenceEnds;
}

export interface ExpandRecurrenceResult {
  dates: string[];
  truncated: boolean;
}
