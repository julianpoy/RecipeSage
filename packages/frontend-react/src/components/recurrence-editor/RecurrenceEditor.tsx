import { useEffect, useEffectEvent, useId, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "../../i18n/TranslationKey";
import { MAX_OCCURRENCES, expandRecurrence } from "./util/expandRecurrence";
import type {
  MonthlyPattern,
  RecurrenceEnds,
  RecurrenceFrequency,
  RecurrenceRule,
} from "./util/recurrenceRule";

const WEEKDAY_LABELS: { weekday: number; label: TranslationKey }[] = [
  { weekday: 0, label: "components.recurrenceEditor.weekdayShort.sun" },
  { weekday: 1, label: "components.recurrenceEditor.weekdayShort.mon" },
  { weekday: 2, label: "components.recurrenceEditor.weekdayShort.tue" },
  { weekday: 3, label: "components.recurrenceEditor.weekdayShort.wed" },
  { weekday: 4, label: "components.recurrenceEditor.weekdayShort.thu" },
  { weekday: 5, label: "components.recurrenceEditor.weekdayShort.fri" },
  { weekday: 6, label: "components.recurrenceEditor.weekdayShort.sat" },
];

const WEEKDAY_NAME_KEYS: Record<number, TranslationKey | undefined> = {
  0: "components.recurrenceEditor.weekday.0",
  1: "components.recurrenceEditor.weekday.1",
  2: "components.recurrenceEditor.weekday.2",
  3: "components.recurrenceEditor.weekday.3",
  4: "components.recurrenceEditor.weekday.4",
  5: "components.recurrenceEditor.weekday.5",
  6: "components.recurrenceEditor.weekday.6",
};

const ORDINAL_KEYS: Record<number, TranslationKey | undefined> = {
  1: "components.recurrenceEditor.ordinal.1",
  2: "components.recurrenceEditor.ordinal.2",
  3: "components.recurrenceEditor.ordinal.3",
  4: "components.recurrenceEditor.ordinal.4",
  5: "components.recurrenceEditor.ordinal.5",
};

const FREQUENCY_KEYS: Record<RecurrenceFrequency, TranslationKey> = {
  daily: "components.recurrenceEditor.frequency.daily",
  weekly: "components.recurrenceEditor.frequency.weekly",
  monthly: "components.recurrenceEditor.frequency.monthly",
};

const UNIT_KEYS: Record<RecurrenceFrequency, TranslationKey> = {
  daily: "components.recurrenceEditor.unit.day",
  weekly: "components.recurrenceEditor.unit.week",
  monthly: "components.recurrenceEditor.unit.month",
};

const FREQUENCIES: RecurrenceFrequency[] = ["daily", "weekly", "monthly"];

const isFrequency = (value: unknown): value is RecurrenceFrequency =>
  value === "daily" || value === "weekly" || value === "monthly";

const isMonthlyPattern = (value: unknown): value is MonthlyPattern =>
  value === "dayOfMonth" || value === "weekdayOfMonth";

const isEndsType = (value: unknown): value is RecurrenceEnds["type"] =>
  value === "onDate" || value === "afterOccurrences";

interface RecurrenceState {
  enabled: boolean;
  frequency: RecurrenceFrequency;
  interval: number;
  weekDays: number[];
  monthlyPattern: MonthlyPattern;
  endsType: RecurrenceEnds["type"];
  endsOnDate: string;
  endsAfterCount: number;
}

const syncDefaultsToBaseDate = (
  state: RecurrenceState,
  baseDate: string,
): RecurrenceState => {
  const base = dayjs(baseDate);
  if (!base.isValid()) return state;
  const baseWeekday = base.day();
  let weekDays = state.weekDays;
  if (weekDays.length === 0) {
    weekDays = [baseWeekday];
  } else if (!weekDays.includes(baseWeekday)) {
    weekDays = [...weekDays, baseWeekday].sort((a, b) => a - b);
  }
  let endsOnDate = state.endsOnDate;
  if (!endsOnDate || dayjs(endsOnDate).isBefore(base, "day")) {
    endsOnDate = base.add(1, "month").format("YYYY-MM-DD");
  }
  return { ...state, weekDays, endsOnDate };
};

const buildRule = (state: RecurrenceState): RecurrenceRule => ({
  frequency: state.frequency,
  interval: state.interval,
  ...(state.frequency === "weekly" ? { weekDays: state.weekDays } : {}),
  ...(state.frequency === "monthly"
    ? { monthlyPattern: state.monthlyPattern }
    : {}),
  ends:
    state.endsType === "onDate"
      ? { type: "onDate", date: state.endsOnDate }
      : { type: "afterOccurrences", count: state.endsAfterCount },
});

const computePreview = (baseDate: string, rule: RecurrenceRule) => {
  try {
    const { dates, truncated } = expandRecurrence(baseDate, rule);
    return { count: dates.length, truncated, error: false };
  } catch {
    return { count: 0, truncated: false, error: true };
  }
};

const parsePositiveInt = (value: string) => {
  const n = Number(value);
  if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  return undefined;
};

export const RecurrenceEditor = ({
  baseDate = dayjs().format("YYYY-MM-DD"),
  onRuleChange,
  onRuleValidChange,
}: {
  baseDate?: string;
  onRuleChange?: (rule: RecurrenceRule | null) => void;
  onRuleValidChange?: (valid: boolean) => void;
}) => {
  const { t } = useTranslation();
  const repeatSwitchId = useId();
  const [state, setState] = useState<RecurrenceState>(() =>
    syncDefaultsToBaseDate(
      {
        enabled: false,
        frequency: "weekly",
        interval: 1,
        weekDays: [],
        monthlyPattern: "dayOfMonth",
        endsType: "afterOccurrences",
        endsOnDate: dayjs().add(1, "month").format("YYYY-MM-DD"),
        endsAfterCount: 10,
      },
      baseDate,
    ),
  );
  const [intervalText, setIntervalText] = useState(String(state.interval));
  const [endsAfterCountText, setEndsAfterCountText] = useState(
    String(state.endsAfterCount),
  );
  const [syncedBaseDate, setSyncedBaseDate] = useState(baseDate);

  if (syncedBaseDate !== baseDate) {
    setSyncedBaseDate(baseDate);
    setState(syncDefaultsToBaseDate(state, baseDate));
  }

  const rule = useMemo(() => buildRule(state), [state]);
  const preview = useMemo(
    () => computePreview(baseDate, rule),
    [baseDate, rule],
  );

  const emit = (nextState: RecurrenceState, nextBaseDate: string) => {
    const nextRule = buildRule(nextState);
    const nextPreview = computePreview(nextBaseDate, nextRule);
    onRuleChange?.(nextState.enabled ? nextRule : null);
    onRuleValidChange?.(
      !nextState.enabled || (!nextPreview.error && nextPreview.count > 0),
    );
  };

  const update = (patch: Partial<RecurrenceState>) => {
    const nextState = { ...state, ...patch };
    setState(nextState);
    emit(nextState, baseDate);
  };

  const onBaseDateChanged = useEffectEvent(() => {
    if (state.enabled) emit(state, baseDate);
  });
  useEffect(() => {
    onBaseDateChanged();
  }, [baseDate]);

  const base = dayjs(baseDate);
  const baseIsValid = base.isValid();
  const baseWeekday = base.day();

  const monthlyDayOfMonthLabel = baseIsValid
    ? t("components.recurrenceEditor.monthlyOnDay", { day: base.date() })
    : "";

  const monthlyWeekdayOfMonthLabel = (() => {
    if (!baseIsValid) return "";
    const nth = Math.floor((base.date() - 1) / 7) + 1;
    const ordinalKey = ORDINAL_KEYS[nth];
    const weekdayKey = WEEKDAY_NAME_KEYS[base.day()];
    return t("components.recurrenceEditor.monthlyOnNthWeekday", {
      ordinal: ordinalKey ? t(ordinalKey) : "",
      weekday: weekdayKey ? t(weekdayKey) : "",
    });
  })();

  const toggleWeekday = (weekday: number) => {
    if (baseWeekday === weekday) return;
    update({
      weekDays: state.weekDays.includes(weekday)
        ? state.weekDays.filter((d) => d !== weekday)
        : [...state.weekDays, weekday].sort((a, b) => a - b),
    });
  };

  const renderPreview = () => {
    if (preview.error) {
      return (
        <span className="text-destructive">
          {t("components.recurrenceEditor.preview.invalid")}
        </span>
      );
    }
    if (preview.count === 0) {
      return (
        <span className="text-destructive">
          {t("components.recurrenceEditor.preview.empty")}
        </span>
      );
    }
    if (preview.truncated) {
      return (
        <span className="text-amber-600 dark:text-amber-400">
          {t("components.recurrenceEditor.preview.truncated", {
            count: preview.count,
            max: MAX_OCCURRENCES,
          })}
        </span>
      );
    }
    return (
      <span className="text-muted-foreground">
        {t("components.recurrenceEditor.preview.count", {
          count: preview.count,
        })}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Label
          htmlFor={repeatSwitchId}
          className="flex-1 text-base font-normal"
        >
          {t("components.recurrenceEditor.repeat")}
        </Label>
        <Switch
          id={repeatSwitchId}
          checked={state.enabled}
          onCheckedChange={(enabled) => update({ enabled })}
        />
      </div>

      {state.enabled && (
        <div className="py-2 ps-6">
          <div className="flex items-center gap-3 px-4 py-2">
            <span className="flex-1">
              {t("components.recurrenceEditor.frequency")}
            </span>
            <Select
              value={state.frequency}
              items={FREQUENCIES.map((frequency) => ({
                value: frequency,
                label: t(FREQUENCY_KEYS[frequency]),
              }))}
              onValueChange={(frequency) => {
                if (isFrequency(frequency)) update({ frequency });
              }}
            >
              <SelectTrigger
                aria-label={t("components.recurrenceEditor.frequency")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((frequency) => (
                  <SelectItem key={frequency} value={frequency}>
                    {t(FREQUENCY_KEYS[frequency])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ps-6">
            <div className="flex items-center gap-3.5 px-4 py-1.5">
              <span>{t("components.recurrenceEditor.every")}</span>
              <Input
                type="number"
                min={1}
                max={365}
                aria-label={t("components.recurrenceEditor.every")}
                className="w-20 shrink-0"
                value={intervalText}
                onChange={(event) => {
                  setIntervalText(event.target.value);
                  const interval = parsePositiveInt(event.target.value);
                  if (interval !== undefined) update({ interval });
                }}
              />
              <span className="text-[0.9em] text-muted-foreground">
                {t(UNIT_KEYS[state.frequency])}
              </span>
            </div>

            {state.frequency === "weekly" && (
              <div className="py-2.5 ps-4">
                <div className="mb-1.5 text-[0.85em] text-muted-foreground">
                  {t("components.recurrenceEditor.repeatOn")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_LABELS.map((entry) => {
                    const selected = state.weekDays.includes(entry.weekday);
                    const isBase = baseWeekday === entry.weekday;
                    const weekdayNameKey = WEEKDAY_NAME_KEYS[entry.weekday];
                    return (
                      <button
                        key={entry.weekday}
                        type="button"
                        aria-label={
                          weekdayNameKey ? t(weekdayNameKey) : undefined
                        }
                        aria-pressed={selected}
                        disabled={isBase}
                        className={cn(
                          "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-muted-foreground/60 text-[0.85em] leading-none outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-default disabled:opacity-60",
                          selected && "border-2 border-primary",
                        )}
                        onClick={() => toggleWeekday(entry.weekday)}
                      >
                        {t(entry.label)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {state.frequency === "monthly" && (
              <RadioGroup
                value={state.monthlyPattern}
                onValueChange={(monthlyPattern) => {
                  if (isMonthlyPattern(monthlyPattern)) {
                    update({ monthlyPattern });
                  }
                }}
                className="gap-0"
              >
                <Label className="px-4 py-2 text-base font-normal">
                  <RadioGroupItem value="dayOfMonth" />
                  {monthlyDayOfMonthLabel}
                </Label>
                <Label className="px-4 py-2 text-base font-normal">
                  <RadioGroupItem value="weekdayOfMonth" />
                  {monthlyWeekdayOfMonthLabel}
                </Label>
              </RadioGroup>
            )}
          </div>

          <div className="px-4 py-2">
            {t("components.recurrenceEditor.ends")}
          </div>
          <div className="ps-6">
            <RadioGroup
              value={state.endsType}
              onValueChange={(endsType) => {
                if (isEndsType(endsType)) update({ endsType });
              }}
              className="gap-0"
            >
              <div className="flex min-h-12 items-center gap-3.5 px-4 py-1.5">
                <Label className="text-base font-normal">
                  <RadioGroupItem value="onDate" />
                  {t("components.recurrenceEditor.ends.onDate")}
                </Label>
                {state.endsType === "onDate" && (
                  <input
                    type="date"
                    aria-label={t("components.recurrenceEditor.ends.onDate")}
                    className="cursor-pointer border-none bg-transparent p-0 dark:[color-scheme:dark]"
                    min={baseDate}
                    value={state.endsOnDate}
                    onChange={(event) =>
                      update({ endsOnDate: event.target.value })
                    }
                  />
                )}
              </div>

              <div className="flex min-h-12 items-center gap-3.5 px-4 py-1.5">
                <Label className="text-base font-normal">
                  <RadioGroupItem value="afterOccurrences" />
                  {t("components.recurrenceEditor.ends.afterOccurrences")}
                </Label>
                {state.endsType === "afterOccurrences" && (
                  <>
                    <Input
                      type="number"
                      min={1}
                      max={MAX_OCCURRENCES}
                      aria-label={t(
                        "components.recurrenceEditor.ends.afterOccurrences",
                      )}
                      className="w-20 shrink-0"
                      value={endsAfterCountText}
                      onChange={(event) => {
                        setEndsAfterCountText(event.target.value);
                        const endsAfterCount = parsePositiveInt(
                          event.target.value,
                        );
                        if (endsAfterCount !== undefined) {
                          update({ endsAfterCount });
                        }
                      }}
                    />
                    <span className="text-[0.9em] text-muted-foreground">
                      {t("components.recurrenceEditor.ends.occurrences")}
                    </span>
                  </>
                )}
              </div>
            </RadioGroup>

            <div className="ps-[38px] pe-4 pb-1 text-[0.85em] leading-tight">
              {renderPreview()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
