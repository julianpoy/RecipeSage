import { Component, Input, inject } from "@angular/core";
import { PopoverController } from "@ionic/angular/standalone";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import type { NutritionFilter, NutritionRange } from "@recipesage/prisma";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonItemDivider,
  IonInput,
  IonCheckbox,
  IonFooter,
  IonButton,
  IonLabel,
} from "@ionic/angular/standalone";

type MacroKey = "calories" | "protein" | "totalCarbs" | "totalFat" | "sodium";

interface MacroDef {
  key: MacroKey;
  labelKey: string;
}

const MACROS: MacroDef[] = [
  { key: "calories", labelKey: "components.nutritionFilterPopover.calories" },
  { key: "protein", labelKey: "components.nutritionFilterPopover.protein" },
  {
    key: "totalCarbs",
    labelKey: "components.nutritionFilterPopover.totalCarbs",
  },
  { key: "totalFat", labelKey: "components.nutritionFilterPopover.totalFat" },
  { key: "sodium", labelKey: "components.nutritionFilterPopover.sodium" },
];

interface MacroRowState {
  min: number | null;
  max: number | null;
  matchMissing: boolean;
}

@Component({
  standalone: true,
  selector: "nutrition-filter-popover",
  templateUrl: "nutrition-filter-popover.component.html",
  styleUrls: ["./nutrition-filter-popover.component.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonItemDivider,
    IonInput,
    IonCheckbox,
    IonFooter,
    IonButton,
    IonLabel,
  ],
})
export class NutritionFilterPopoverComponent {
  private popoverCtrl = inject(PopoverController);

  readonly macros = MACROS;

  state: Record<MacroKey, MacroRowState> = {
    calories: { min: null, max: null, matchMissing: false },
    protein: { min: null, max: null, matchMissing: false },
    totalCarbs: { min: null, max: null, matchMissing: false },
    totalFat: { min: null, max: null, matchMissing: false },
    sodium: { min: null, max: null, matchMissing: false },
  };

  @Input()
  set nutritionFilter(filter: NutritionFilter) {
    for (const macro of MACROS) {
      const range = filter[macro.key];
      this.state[macro.key] = {
        min: range?.min ?? null,
        max: range?.max ?? null,
        matchMissing: !!range?.matchMissing,
      };
    }
  }

  private rowToRange(row: MacroRowState): NutritionRange | undefined {
    const hasRange = row.min != null || row.max != null;
    if (!hasRange && !row.matchMissing) return undefined;
    const range: NutritionRange = {};
    if (hasRange) {
      let min = row.min ?? undefined;
      let max = row.max ?? undefined;
      if (min != null && max != null && min > max) {
        [min, max] = [max, min];
      }
      if (min != null) range.min = min;
      if (max != null) range.max = max;
    }
    if (row.matchMissing) range.matchMissing = true;
    return range;
  }

  reset() {
    for (const macro of MACROS) {
      this.state[macro.key] = { min: null, max: null, matchMissing: false };
    }
    this.apply();
  }

  apply() {
    const result: NutritionFilter = {};
    for (const macro of MACROS) {
      const range = this.rowToRange(this.state[macro.key]);
      if (range) result[macro.key] = range;
    }
    this.popoverCtrl.dismiss({ nutritionFilter: result });
  }

  checkboxLabelKey(macroKey: MacroKey): string {
    const row = this.state[macroKey];
    return row.min == null && row.max == null
      ? "components.nutritionFilterPopover.matchMissingOnly"
      : "components.nutritionFilterPopover.matchMissing";
  }

  onInputChange(
    macroKey: MacroKey,
    field: "min" | "max",
    value: string | number | null | undefined,
  ) {
    if (value === "" || value == null) {
      this.state[macroKey][field] = null;
      return;
    }
    const num = typeof value === "number" ? value : parseFloat(value);
    this.state[macroKey][field] = Number.isFinite(num) ? num : null;
  }
}
