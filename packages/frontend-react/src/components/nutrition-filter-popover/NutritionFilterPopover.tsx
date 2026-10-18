import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { NutritionFilter, NutritionRange } from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TextField } from "../forms/TextField";
import type { TranslationKey } from "../../i18n/TranslationKey";

type MacroKey = "calories" | "protein" | "totalCarbs" | "totalFat" | "sodium";

const MACROS: { key: MacroKey; labelKey: TranslationKey }[] = [
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
  min: string;
  max: string;
  matchMissing: boolean;
}

type FilterState = Record<MacroKey, MacroRowState>;

const EMPTY_ROW: MacroRowState = { min: "", max: "", matchMissing: false };

const createEmptyState = (): FilterState => ({
  calories: EMPTY_ROW,
  protein: EMPTY_ROW,
  totalCarbs: EMPTY_ROW,
  totalFat: EMPTY_ROW,
  sodium: EMPTY_ROW,
});

const createStateFromFilter = (filter: NutritionFilter): FilterState => {
  const state = createEmptyState();
  for (const macro of MACROS) {
    const range = filter[macro.key];
    state[macro.key] = {
      min: range?.min != null ? String(range.min) : "",
      max: range?.max != null ? String(range.max) : "",
      matchMissing: !!range?.matchMissing,
    };
  }
  return state;
};

const parseNumber = (value: string): number | null => {
  if (value.trim() === "") return null;
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : null;
};

const rowToRange = (row: MacroRowState): NutritionRange | undefined => {
  const rowMin = parseNumber(row.min);
  const rowMax = parseNumber(row.max);
  const hasRange = rowMin != null || rowMax != null;
  if (!hasRange && !row.matchMissing) return undefined;
  const range: NutritionRange = {};
  if (hasRange) {
    let min = rowMin ?? undefined;
    let max = rowMax ?? undefined;
    if (min != null && max != null && min > max) {
      [min, max] = [max, min];
    }
    if (min != null) range.min = min;
    if (max != null) range.max = max;
  }
  if (row.matchMissing) range.matchMissing = true;
  return range;
};

const stateToFilter = (state: FilterState): NutritionFilter => {
  const result: NutritionFilter = {};
  for (const macro of MACROS) {
    const range = rowToRange(state[macro.key]);
    if (range) result[macro.key] = range;
  }
  return result;
};

export const NutritionFilterPopover = ({
  nutritionFilter,
  onApply,
}: {
  nutritionFilter: NutritionFilter;
  onApply: (nutritionFilter: NutritionFilter) => void;
}) => {
  const { t } = useTranslation();
  const [state, setState] = useState<FilterState>(() =>
    createStateFromFilter(nutritionFilter),
  );

  const updateRow = (macroKey: MacroKey, patch: Partial<MacroRowState>) => {
    setState((prev) => ({
      ...prev,
      [macroKey]: { ...prev[macroKey], ...patch },
    }));
  };

  const checkboxLabelKey = (macroKey: MacroKey): TranslationKey => {
    const row = state[macroKey];
    return parseNumber(row.min) == null && parseNumber(row.max) == null
      ? "components.nutritionFilterPopover.matchMissingOnly"
      : "components.nutritionFilterPopover.matchMissing";
  };

  return (
    <div className="flex max-h-[80vh] min-h-0 flex-col">
      <h2 className="shrink-0 px-4 py-3 text-lg font-medium">
        {t("components.nutritionFilterPopover.title")}
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {MACROS.map((macro) => {
          const row = state[macro.key];
          return (
            <div key={macro.key} className="mb-4 last:mb-0">
              <div className="bg-muted px-4 py-2 text-sm font-medium">
                {t(macro.labelKey)}
              </div>
              <div className="flex gap-3 px-4 pt-1 pb-2">
                <TextField
                  type="number"
                  min={0}
                  inputMode="decimal"
                  label={t("components.nutritionFilterPopover.min")}
                  value={row.min}
                  onValueChange={(min) => updateRow(macro.key, { min })}
                />
                <TextField
                  type="number"
                  min={0}
                  inputMode="decimal"
                  label={t("components.nutritionFilterPopover.max")}
                  value={row.max}
                  onValueChange={(max) => updateRow(macro.key, { max })}
                />
              </div>
              <Label className="min-h-10 px-4 text-sm font-normal">
                <Checkbox
                  checked={row.matchMissing}
                  onCheckedChange={(matchMissing) =>
                    updateRow(macro.key, { matchMissing })
                  }
                />
                {t(checkboxLabelKey(macro.key))}
              </Label>
            </div>
          );
        })}
      </div>
      <div className="flex shrink-0 justify-end gap-1 border-t px-2 py-2">
        <Button
          variant="ghost"
          className="text-primary"
          onClick={() => {
            const emptyState = createEmptyState();
            setState(emptyState);
            onApply(stateToFilter(emptyState));
          }}
        >
          {t("components.nutritionFilterPopover.reset")}
        </Button>
        <Button
          variant="ghost"
          className="text-primary"
          onClick={() => onApply(stateToFilter(state))}
        >
          {t("components.nutritionFilterPopover.apply")}
        </Button>
      </div>
    </div>
  );
};
