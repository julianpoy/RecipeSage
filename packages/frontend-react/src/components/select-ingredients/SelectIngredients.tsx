import { useEffect, useEffectEvent, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { System } from "@recipesage/unitz-ts";
import {
  ShoppingListPreferenceKey,
  applyDecimalNotation,
  inferIngredientsNotation,
  parseIngredients,
  type ParsedIngredient,
} from "@recipesage/util/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { usePropSyncedState } from "../../hooks/usePropSyncedState";
import { openScaleRecipe } from "../../modals/scale-recipe/openScaleRecipe";
import type { UnitSystem } from "../../modals/scale-recipe/ScaleRecipe";
import { preferencesStore } from "../../stores/preferencesStore";
import { getCurrentLocale } from "../../utils/formatDate";

export const SelectIngredients = ({
  ingredients,
  initialScale = "1",
  initialUnitSystem = "original",
  onSelectedIngredientsChange,
}: {
  ingredients: string;
  initialScale?: string;
  initialUnitSystem?: UnitSystem;
  onSelectedIngredientsChange?: (
    selectedIngredients: ParsedIngredient[],
  ) => void;
}) => {
  const { t } = useTranslation();
  const idPrefix = useId();
  const ignoreItemTitles = preferencesStore(
    (state) => state.preferences[ShoppingListPreferenceKey.IgnoreItemTitles],
  );
  const [scale, setScale] = usePropSyncedState(initialScale);
  const [unitSystem, setUnitSystem] = usePropSyncedState(initialUnitSystem);
  const [allSelected, setAllSelected] = useState(true);
  const [bindersState, setBindersState] = useState<{
    ingredients: string;
    values: boolean[];
  }>();

  const decimalNotationMode = useMemo(
    () => inferIngredientsNotation(ingredients, getCurrentLocale()),
    [ingredients],
  );

  const scaledIngredients = useMemo(() => {
    const targetSystem =
      unitSystem === "metric"
        ? System.METRIC
        : unitSystem === "imperial"
          ? System.US
          : undefined;

    return parseIngredients(ingredients, scale, {
      targetSystem,
      decimalNotationMode,
    }).filter((e) => !e.isHeader);
  }, [ingredients, scale, unitSystem, decimalNotationMode]);

  const binders = useMemo(() => {
    if (bindersState && bindersState.ingredients === ingredients) {
      return bindersState.values;
    }

    const ignoredIngredients = ignoreItemTitles
      .split("\n")
      .filter((el) => el.trim())
      .map((el) => el.toLowerCase());

    return scaledIngredients.map((ingredient) => {
      const ingredientLowerCase = ingredient.originalContent.toLowerCase();
      return !ignoredIngredients.some((ignoredIngredient) =>
        ingredientLowerCase.includes(ignoredIngredient),
      );
    });
  }, [bindersState, ingredients, ignoreItemTitles, scaledIngredients]);

  const selectedIngredients = useMemo(
    () => scaledIngredients.filter((_, idx) => binders[idx]),
    [scaledIngredients, binders],
  );

  const emitSelectedIngredients = useEffectEvent(
    (selected: ParsedIngredient[]) => {
      onSelectedIngredientsChange?.(selected);
    },
  );

  useEffect(() => {
    emitSelectedIngredients(selectedIngredients);
  }, [selectedIngredients]);

  const scaleDisplay = applyDecimalNotation(scale, decimalNotationMode);

  const toggleIngredient = (idx: number, checked: boolean) => {
    const values = [...binders];
    values[idx] = checked;
    setBindersState({ ingredients, values });
  };

  const resetAll = (checked: boolean) => {
    setAllSelected(checked);
    setBindersState({
      ingredients,
      values: binders.map(() => checked),
    });
  };

  const changeScale = async () => {
    const data = await openScaleRecipe({
      scale,
      unitSystem,
      ingredients: scaledIngredients,
      decimalNotationMode,
    });

    if (!data) return;

    if (data.scale) {
      setScale(data.scale);
    }
    if (data.unitSystem) {
      setUnitSystem(data.unitSystem);
    }
  };

  if (!scaledIngredients.length) {
    return (
      <div>
        <p className="font-bold">{t("components.selectIngredients.null")}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2">{t("components.selectIngredients.title")}</p>
      <label
        htmlFor={`${idPrefix}-all`}
        className="flex min-h-11 cursor-pointer items-center gap-4 border-b px-4 py-2"
      >
        <Checkbox
          id={`${idPrefix}-all`}
          checked={allSelected}
          onCheckedChange={resetAll}
        />
        <span>{t("components.selectIngredients.toggleAll")}</span>
      </label>
      {scaledIngredients.map((ingredient, idx) => (
        <label
          key={idx}
          htmlFor={`${idPrefix}-${idx}`}
          className="flex min-h-11 cursor-pointer items-center gap-4 border-b px-4 py-2"
        >
          <Checkbox
            id={`${idPrefix}-${idx}`}
            checked={!!binders[idx]}
            onCheckedChange={(checked) => toggleIngredient(idx, checked)}
          />
          <span dir="auto" className="min-w-0 flex-1 break-words">
            {ingredient.plaintextContent}
          </span>
        </label>
      ))}
      <button
        type="button"
        className="mt-4 cursor-pointer text-primary hover:underline"
        onClick={() => void changeScale()}
      >
        {t("components.selectIngredients.scale", { scale: scaleDisplay })}
      </button>
    </div>
  );
};
