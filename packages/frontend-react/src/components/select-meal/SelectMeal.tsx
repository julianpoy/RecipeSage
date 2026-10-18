import { useEffect, useEffectEvent, useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getMealDisplayNames, getOrderedMeals } from "@recipesage/util/shared";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePropSyncedState } from "../../hooks/usePropSyncedState";
import type { TranslationKey } from "../../i18n/TranslationKey";

const LAST_USED_MEAL_VAR = "lastUsedMeal";

const DEFAULT_MEAL_TRANSLATION_KEYS: Record<string, TranslationKey> = {
  breakfast: "components.mealCalendar.breakfast",
  lunch: "components.mealCalendar.lunch",
  dinner: "components.mealCalendar.dinner",
  snacks: "components.mealCalendar.snack",
  other: "components.mealCalendar.other",
};

export const SelectMeal = ({
  meal: mealInput = "",
  customMealOptions = null,
  onMealChange,
}: {
  meal?: string;
  customMealOptions?: string | null;
  onMealChange?: (meal: string) => void;
}) => {
  const { t } = useTranslation();
  const triggerId = useId();
  const [meal, setMeal] = usePropSyncedState(mealInput);

  const mealOptions = useMemo(() => {
    const orderedMeals = getOrderedMeals(customMealOptions);
    const displayNames = getMealDisplayNames(customMealOptions);

    return orderedMeals.map((mealKey) => {
      const translationKey = DEFAULT_MEAL_TRANSLATION_KEYS[mealKey];
      if (translationKey) {
        return { key: mealKey, title: t(translationKey) };
      }
      return {
        key: mealKey,
        title: displayNames[mealKey.toLowerCase()] || mealKey,
      };
    });
  }, [customMealOptions, t]);

  const mealChanged = (newMeal: string) => {
    setMeal(newMeal);
    onMealChange?.(newMeal);
    localStorage.setItem(LAST_USED_MEAL_VAR, newMeal);
  };

  const selectLastUsedMeal = useEffectEvent(() => {
    if (meal) return;

    const lastUsedMeal = localStorage.getItem(LAST_USED_MEAL_VAR);
    const mealExists = mealOptions.find(
      (option) => option.key.toLowerCase() === lastUsedMeal?.toLowerCase(),
    );

    if (lastUsedMeal && mealExists) {
      mealChanged(mealExists.key);
    }
  });

  useEffect(() => {
    const timeout = setTimeout(() => selectLastUsedMeal());
    return () => clearTimeout(timeout);
  }, [customMealOptions]);

  return (
    <Field>
      <FieldLabel htmlFor={triggerId}>
        {t("components.selectMeal.title")}
      </FieldLabel>
      <Select
        value={meal || null}
        items={mealOptions.map((option) => ({
          value: option.key,
          label: option.title,
        }))}
        onValueChange={(value) => {
          if (typeof value === "string") mealChanged(value);
        }}
      >
        <SelectTrigger id={triggerId} className="h-10 w-full">
          <SelectValue dir="auto" />
        </SelectTrigger>
        <SelectContent>
          {mealOptions.map((option) => (
            <SelectItem key={option.key} value={option.key}>
              <span dir="auto">{option.title}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
};
