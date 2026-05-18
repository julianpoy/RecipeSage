import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import dayjs from "dayjs";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { MAX_OCCURRENCES, expandRecurrence } from "./util/expandRecurrence";
import type {
  MonthlyPattern,
  RecurrenceEnds,
  RecurrenceFrequency,
  RecurrenceRule,
} from "./util/recurrenceRule";
import {
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonRadioGroup,
  IonRadio,
  IonNote,
  IonToggle,
} from "@ionic/angular/standalone";

const WEEKDAY_LABELS = [
  { weekday: 0, label: "components.recurrenceEditor.weekdayShort.sun" },
  { weekday: 1, label: "components.recurrenceEditor.weekdayShort.mon" },
  { weekday: 2, label: "components.recurrenceEditor.weekdayShort.tue" },
  { weekday: 3, label: "components.recurrenceEditor.weekdayShort.wed" },
  { weekday: 4, label: "components.recurrenceEditor.weekdayShort.thu" },
  { weekday: 5, label: "components.recurrenceEditor.weekdayShort.fri" },
  { weekday: 6, label: "components.recurrenceEditor.weekdayShort.sat" },
] as const;

@Component({
  standalone: true,
  selector: "recurrence-editor",
  templateUrl: "./recurrence-editor.component.html",
  styleUrls: ["./recurrence-editor.component.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonRadioGroup,
    IonRadio,
    IonNote,
    IonToggle,
  ],
})
export class RecurrenceEditorComponent implements OnChanges {
  private translate = inject(TranslateService);

  @Input() baseDate: string = dayjs().format("YYYY-MM-DD");
  @Output() ruleChange = new EventEmitter<RecurrenceRule | null>();

  enabled = false;
  frequency: RecurrenceFrequency = "weekly";
  interval = 1;
  weekDays: number[] = [];
  monthlyPattern: MonthlyPattern = "dayOfMonth";
  endsType: RecurrenceEnds["type"] = "afterOccurrences";
  endsOnDate: string = dayjs().add(1, "month").format("YYYY-MM-DD");
  endsAfterCount = 10;

  readonly weekdayLabels = WEEKDAY_LABELS;
  readonly maxOccurrences = MAX_OCCURRENCES;

  ngOnChanges(changes: SimpleChanges) {
    if (changes["baseDate"]) {
      this.syncDefaultsToBaseDate();
      if (this.enabled) this.onChange();
    }
  }

  private syncDefaultsToBaseDate() {
    const base = dayjs(this.baseDate);
    if (!base.isValid()) return;
    const baseWeekday = base.day();
    if (this.weekDays.length === 0) {
      this.weekDays = [baseWeekday];
    } else if (!this.weekDays.includes(baseWeekday)) {
      this.weekDays = [...this.weekDays, baseWeekday].sort((a, b) => a - b);
    }
    if (!this.endsOnDate || dayjs(this.endsOnDate).isBefore(base, "day")) {
      this.endsOnDate = base.add(1, "month").format("YYYY-MM-DD");
    }
  }

  get rule(): RecurrenceRule {
    return {
      frequency: this.frequency,
      interval: this.interval,
      ...(this.frequency === "weekly" ? { weekDays: this.weekDays } : {}),
      ...(this.frequency === "monthly"
        ? { monthlyPattern: this.monthlyPattern }
        : {}),
      ends:
        this.endsType === "onDate"
          ? { type: "onDate", date: this.endsOnDate }
          : { type: "afterOccurrences", count: this.endsAfterCount },
    };
  }

  get preview(): { count: number; truncated: boolean; error: string | null } {
    try {
      const { dates, truncated } = expandRecurrence(this.baseDate, this.rule);
      return { count: dates.length, truncated, error: null };
    } catch (err) {
      return {
        count: 0,
        truncated: false,
        error: err instanceof Error ? err.message : "Invalid rule",
      };
    }
  }

  get monthlyDayOfMonthLabel(): string {
    const base = dayjs(this.baseDate);
    if (!base.isValid()) return "";
    return this.translate.instant("components.recurrenceEditor.monthlyOnDay", {
      day: base.date(),
    });
  }

  get monthlyWeekdayOfMonthLabel(): string {
    const base = dayjs(this.baseDate);
    if (!base.isValid()) return "";
    const nth = Math.floor((base.date() - 1) / 7) + 1;
    const ordinal = this.translate.instant(
      `components.recurrenceEditor.ordinal.${nth}`,
    );
    const weekday = this.translate.instant(
      `components.recurrenceEditor.weekday.${base.day()}`,
    );
    return this.translate.instant(
      "components.recurrenceEditor.monthlyOnNthWeekday",
      { ordinal, weekday },
    );
  }

  onChange() {
    this.ruleChange.emit(this.enabled ? this.rule : null);
  }

  toggleWeekday(weekday: number) {
    if (this.isBaseWeekday(weekday)) return;
    this.weekDays = this.weekDays.includes(weekday)
      ? this.weekDays.filter((d) => d !== weekday)
      : [...this.weekDays, weekday].sort((a, b) => a - b);
    this.onChange();
  }

  setIntervalFromInput(value: string | null | undefined) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 1) {
      this.interval = Math.floor(n);
      this.onChange();
    }
  }

  setEndsAfterCountFromInput(value: string | null | undefined) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 1) {
      this.endsAfterCount = Math.floor(n);
      this.onChange();
    }
  }

  isWeekdaySelected(weekday: number) {
    return this.weekDays.includes(weekday);
  }

  isBaseWeekday(weekday: number) {
    return dayjs(this.baseDate).day() === weekday;
  }
}
