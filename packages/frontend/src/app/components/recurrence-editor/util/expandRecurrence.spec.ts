import { describe, it, expect } from "vitest";
import { expandRecurrence, MAX_OCCURRENCES } from "./expandRecurrence";
import type { RecurrenceRule } from "./recurrenceRule";

describe("expandRecurrence", () => {
  describe("daily", () => {
    it("expands every day until end date", () => {
      const rule: RecurrenceRule = {
        frequency: "daily",
        interval: 1,
        ends: { type: "onDate", date: "2026-01-05" },
      };
      const { dates, truncated } = expandRecurrence("2026-01-01", rule);
      expect(dates).toEqual([
        "2026-01-01",
        "2026-01-02",
        "2026-01-03",
        "2026-01-04",
        "2026-01-05",
      ]);
      expect(truncated).toBe(false);
    });

    it("expands every 3 days for a fixed occurrence count", () => {
      const rule: RecurrenceRule = {
        frequency: "daily",
        interval: 3,
        ends: { type: "afterOccurrences", count: 4 },
      };
      const { dates, truncated } = expandRecurrence("2026-02-10", rule);
      expect(dates).toEqual([
        "2026-02-10",
        "2026-02-13",
        "2026-02-16",
        "2026-02-19",
      ]);
      expect(truncated).toBe(false);
    });

    it("caps at MAX_OCCURRENCES when count exceeds the cap", () => {
      const rule: RecurrenceRule = {
        frequency: "daily",
        interval: 1,
        ends: { type: "afterOccurrences", count: MAX_OCCURRENCES + 500 },
      };
      const { dates, truncated } = expandRecurrence("2026-01-01", rule);
      expect(dates.length).toBe(MAX_OCCURRENCES);
      expect(truncated).toBe(true);
    });
  });

  describe("weekly", () => {
    it("repeats weekly on base weekday when no weekDays provided", () => {
      const rule: RecurrenceRule = {
        frequency: "weekly",
        interval: 1,
        ends: { type: "afterOccurrences", count: 3 },
      };
      const { dates } = expandRecurrence("2026-03-04", rule);
      expect(dates).toEqual(["2026-03-04", "2026-03-11", "2026-03-18"]);
    });

    it("repeats on selected weekdays", () => {
      const rule: RecurrenceRule = {
        frequency: "weekly",
        interval: 1,
        weekDays: [1, 3, 5],
        ends: { type: "afterOccurrences", count: 6 },
      };
      const { dates } = expandRecurrence("2026-03-02", rule);
      expect(dates).toEqual([
        "2026-03-02",
        "2026-03-04",
        "2026-03-06",
        "2026-03-09",
        "2026-03-11",
        "2026-03-13",
      ]);
    });

    it("always includes baseDate even if its weekday is not in selection", () => {
      const rule: RecurrenceRule = {
        frequency: "weekly",
        interval: 1,
        weekDays: [1, 3],
        ends: { type: "afterOccurrences", count: 5 },
      };
      const { dates } = expandRecurrence("2026-03-06", rule);
      expect(dates[0]).toBe("2026-03-06");
      expect(dates.length).toBe(5);
    });

    it("skips dates earlier in the start week than baseDate", () => {
      const rule: RecurrenceRule = {
        frequency: "weekly",
        interval: 1,
        weekDays: [1, 3, 5],
        ends: { type: "afterOccurrences", count: 3 },
      };
      const { dates } = expandRecurrence("2026-03-04", rule);
      expect(dates).toEqual(["2026-03-04", "2026-03-06", "2026-03-09"]);
    });

    it("honors weekly interval > 1", () => {
      const rule: RecurrenceRule = {
        frequency: "weekly",
        interval: 2,
        weekDays: [1],
        ends: { type: "afterOccurrences", count: 3 },
      };
      const { dates } = expandRecurrence("2026-03-02", rule);
      expect(dates).toEqual(["2026-03-02", "2026-03-16", "2026-03-30"]);
    });

    it("stops at end date", () => {
      const rule: RecurrenceRule = {
        frequency: "weekly",
        interval: 1,
        weekDays: [1, 4],
        ends: { type: "onDate", date: "2026-03-19" },
      };
      const { dates, truncated } = expandRecurrence("2026-03-02", rule);
      expect(dates).toEqual([
        "2026-03-02",
        "2026-03-05",
        "2026-03-09",
        "2026-03-12",
        "2026-03-16",
        "2026-03-19",
      ]);
      expect(truncated).toBe(false);
    });
  });

  describe("monthly - dayOfMonth", () => {
    it("repeats on same day of month", () => {
      const rule: RecurrenceRule = {
        frequency: "monthly",
        interval: 1,
        monthlyPattern: "dayOfMonth",
        ends: { type: "afterOccurrences", count: 4 },
      };
      const { dates } = expandRecurrence("2026-01-17", rule);
      expect(dates).toEqual([
        "2026-01-17",
        "2026-02-17",
        "2026-03-17",
        "2026-04-17",
      ]);
    });

    it("skips months where day does not exist (Jan 31 -> Feb skip)", () => {
      const rule: RecurrenceRule = {
        frequency: "monthly",
        interval: 1,
        monthlyPattern: "dayOfMonth",
        ends: { type: "afterOccurrences", count: 4 },
      };
      const { dates } = expandRecurrence("2026-01-31", rule);
      expect(dates).toEqual([
        "2026-01-31",
        "2026-03-31",
        "2026-05-31",
        "2026-07-31",
      ]);
    });

    it("honors monthly interval > 1", () => {
      const rule: RecurrenceRule = {
        frequency: "monthly",
        interval: 2,
        monthlyPattern: "dayOfMonth",
        ends: { type: "afterOccurrences", count: 3 },
      };
      const { dates } = expandRecurrence("2026-01-15", rule);
      expect(dates).toEqual(["2026-01-15", "2026-03-15", "2026-05-15"]);
    });

    it("crosses year boundary", () => {
      const rule: RecurrenceRule = {
        frequency: "monthly",
        interval: 1,
        monthlyPattern: "dayOfMonth",
        ends: { type: "afterOccurrences", count: 3 },
      };
      const { dates } = expandRecurrence("2026-11-10", rule);
      expect(dates).toEqual(["2026-11-10", "2026-12-10", "2027-01-10"]);
    });
  });

  describe("monthly - weekdayOfMonth", () => {
    it("repeats on nth weekday of month (3rd Saturday)", () => {
      const rule: RecurrenceRule = {
        frequency: "monthly",
        interval: 1,
        monthlyPattern: "weekdayOfMonth",
        ends: { type: "afterOccurrences", count: 4 },
      };
      const { dates } = expandRecurrence("2026-03-21", rule);
      expect(dates).toEqual([
        "2026-03-21",
        "2026-04-18",
        "2026-05-16",
        "2026-06-20",
      ]);
    });

    it("skips months without a 5th occurrence", () => {
      const rule: RecurrenceRule = {
        frequency: "monthly",
        interval: 1,
        monthlyPattern: "weekdayOfMonth",
        ends: { type: "afterOccurrences", count: 3 },
      };
      const { dates } = expandRecurrence("2026-01-30", rule);
      expect(dates).toEqual(["2026-01-30", "2026-05-29", "2026-07-31"]);
    });
  });

  describe("input validation", () => {
    it("rejects non-positive interval", () => {
      expect(() =>
        expandRecurrence("2026-01-01", {
          frequency: "daily",
          interval: 0,
          ends: { type: "afterOccurrences", count: 5 },
        }),
      ).toThrow();
    });

    it("rejects malformed date string", () => {
      expect(() =>
        expandRecurrence("01/01/2026", {
          frequency: "daily",
          interval: 1,
          ends: { type: "afterOccurrences", count: 5 },
        }),
      ).toThrow();
    });

    it("returns empty for afterOccurrences with count < 1", () => {
      const { dates } = expandRecurrence("2026-01-01", {
        frequency: "daily",
        interval: 1,
        ends: { type: "afterOccurrences", count: 0 },
      });
      expect(dates).toEqual([]);
    });
  });
});
