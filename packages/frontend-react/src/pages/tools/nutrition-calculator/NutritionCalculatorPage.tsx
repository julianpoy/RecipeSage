import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  CircleMinusIcon,
  HeartPulseIcon,
  MinusIcon,
  PlusIcon,
  TagIcon,
} from "lucide-react";
import type { RecipeSummary } from "@recipesage/prisma";
import { parseQuantity } from "@recipesage/util/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextField } from "../../../components/forms/TextField";
import { InfoBlock } from "../../../components/info-block/InfoBlock";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { openSelectLabelModal } from "../../../components/select-label-modal/openSelectLabelModal";
import { openSelectRecipeModal } from "../../../components/select-recipe-modal/openSelectRecipeModal";
import { useEvent } from "../../../hooks/useEvent";
import type { TranslationKey } from "../../../i18n/TranslationKey";
import { EventName, events } from "../../../services/events";
import { loadingService } from "../../../services/loadingService";
import { serverActions } from "../../../services/serverActions";
import { getCurrentLocale } from "../../../utils/formatDate";
import { createHistoryEntrySnapshotStore } from "../createHistoryEntrySnapshotStore";

const RECIPE_PAGE_SIZE = 200;
const FETCH_CHUNK_SIZE = 100;
const MAX_SERVINGS = 999;

type NumericNutritionKey =
  | "nutritionCalories"
  | "nutritionTotalFat"
  | "nutritionSaturatedFat"
  | "nutritionTransFat"
  | "nutritionPolyunsaturatedFat"
  | "nutritionMonounsaturatedFat"
  | "nutritionCholesterol"
  | "nutritionSodium"
  | "nutritionTotalCarbs"
  | "nutritionDietaryFiber"
  | "nutritionTotalSugars"
  | "nutritionAddedSugars"
  | "nutritionProtein"
  | "nutritionVitaminD"
  | "nutritionCalcium"
  | "nutritionIron"
  | "nutritionPotassium";

type NutritionUnit = "kcal" | "g" | "mg" | "mcg";

const DAILY_VALUES: Partial<Record<NumericNutritionKey, number>> = {
  nutritionTotalFat: 78,
  nutritionSaturatedFat: 20,
  nutritionCholesterol: 300,
  nutritionSodium: 2300,
  nutritionTotalCarbs: 275,
  nutritionDietaryFiber: 28,
  nutritionAddedSugars: 50,
  nutritionProtein: 50,
  nutritionVitaminD: 20,
  nutritionCalcium: 1300,
  nutritionIron: 18,
  nutritionPotassium: 4700,
};

const NUTRITION_LABEL_KEYS: Record<NumericNutritionKey, TranslationKey> = {
  nutritionCalories: "pages.recipeDetails.nutritionCalories",
  nutritionTotalFat: "pages.recipeDetails.nutritionTotalFat",
  nutritionSaturatedFat: "pages.recipeDetails.nutritionSaturatedFat",
  nutritionTransFat: "pages.recipeDetails.nutritionTransFat",
  nutritionPolyunsaturatedFat:
    "pages.recipeDetails.nutritionPolyunsaturatedFat",
  nutritionMonounsaturatedFat:
    "pages.recipeDetails.nutritionMonounsaturatedFat",
  nutritionCholesterol: "pages.recipeDetails.nutritionCholesterol",
  nutritionSodium: "pages.recipeDetails.nutritionSodium",
  nutritionTotalCarbs: "pages.recipeDetails.nutritionTotalCarbs",
  nutritionDietaryFiber: "pages.recipeDetails.nutritionDietaryFiber",
  nutritionTotalSugars: "pages.recipeDetails.nutritionTotalSugars",
  nutritionAddedSugars: "pages.recipeDetails.nutritionAddedSugars",
  nutritionProtein: "pages.recipeDetails.nutritionProtein",
  nutritionVitaminD: "pages.recipeDetails.nutritionVitaminD",
  nutritionCalcium: "pages.recipeDetails.nutritionCalcium",
  nutritionIron: "pages.recipeDetails.nutritionIron",
  nutritionPotassium: "pages.recipeDetails.nutritionPotassium",
};

const NUTRITION_UNIT_KEYS: Record<NutritionUnit, TranslationKey> = {
  kcal: "pages.recipeDetails.units.kcal",
  g: "pages.recipeDetails.units.g",
  mg: "pages.recipeDetails.units.mg",
  mcg: "pages.recipeDetails.units.mcg",
};

interface NutritionFieldDef {
  key: NumericNutritionKey;
  unit: NutritionUnit;
  indent?: boolean;
}

const NUTRITION_FIELDS: readonly NutritionFieldDef[] = [
  { key: "nutritionCalories", unit: "kcal" },
  { key: "nutritionTotalFat", unit: "g" },
  { key: "nutritionSaturatedFat", unit: "g", indent: true },
  { key: "nutritionTransFat", unit: "g", indent: true },
  { key: "nutritionPolyunsaturatedFat", unit: "g", indent: true },
  { key: "nutritionMonounsaturatedFat", unit: "g", indent: true },
  { key: "nutritionCholesterol", unit: "mg" },
  { key: "nutritionSodium", unit: "mg" },
  { key: "nutritionTotalCarbs", unit: "g" },
  { key: "nutritionDietaryFiber", unit: "g", indent: true },
  { key: "nutritionTotalSugars", unit: "g", indent: true },
  { key: "nutritionAddedSugars", unit: "g", indent: true },
  { key: "nutritionProtein", unit: "g" },
  { key: "nutritionVitaminD", unit: "mcg" },
  { key: "nutritionCalcium", unit: "mg" },
  { key: "nutritionIron", unit: "mg" },
  { key: "nutritionPotassium", unit: "mg" },
];

interface SelectedRecipe {
  id: string;
  title: string;
  servings: number;
  servingSize: string | null;
}

interface AggregateField {
  key: NumericNutritionKey;
  unit: NutritionUnit;
  indent: boolean;
  value: number;
  dvPercent: number | null;
  presentCount: number;
  missingCount: number;
}

interface MacroBreakdown {
  fatKcal: number;
  carbsKcal: number;
  proteinKcal: number;
  fatPercent: number;
  carbsPercent: number;
  proteinPercent: number;
}

type DisplayMode = "total" | "perServing";

const isDisplayMode = (value: unknown): value is DisplayMode =>
  value === "total" || value === "perServing";

interface NutritionCalculatorSnapshot {
  recipes: SelectedRecipe[];
  nutritionById: Map<string, RecipeSummary>;
  displayMode: DisplayMode;
  bulkServings: string;
  divideAmong: string;
  divideAmongTouched: boolean;
  reloadPending: boolean;
}

const snapshotStore =
  createHistoryEntrySnapshotStore<NutritionCalculatorSnapshot>();

events.subscribe([EventName.RecipeUpdated, EventName.RecipeDeleted], () => {
  for (const snapshot of snapshotStore.snapshots.values()) {
    snapshot.reloadPending = true;
  }
});

const RECIPE_CHANGE_EVENTS = [EventName.RecipeUpdated, EventName.RecipeDeleted];

const round = (value: number): number => Math.round(value * 100) / 100;

const toServingsNumber = (value: string | number): number | null =>
  parseQuantity(String(value), getCurrentLocale());

const clampServingsValue = (value: number, min: number): number => {
  if (!Number.isFinite(value)) return min;
  const clamped = Math.min(MAX_SERVINGS, Math.max(min, value));
  return Math.round(clamped * 100) / 100;
};

const averageDivisorFor = (divideAmong: string): number => {
  const value = toServingsNumber(divideAmong);
  if (value === null || value <= 0) return 1;
  const clamped = clampServingsValue(value, 0);
  return clamped > 0 ? clamped : 1;
};

const recipeHasNutrition = (
  nutritionById: Map<string, RecipeSummary>,
  id: string,
): boolean => {
  const nutrition = nutritionById.get(id);
  if (!nutrition) return false;
  return NUTRITION_FIELDS.some((def) => {
    const value = nutrition[def.key];
    return value !== null && value !== undefined;
  });
};

const computeMacros = (fields: AggregateField[]): MacroBreakdown | null => {
  const fat = fields.find((field) => field.key === "nutritionTotalFat");
  const carbs = fields.find((field) => field.key === "nutritionTotalCarbs");
  const protein = fields.find((field) => field.key === "nutritionProtein");

  if (!fat && !carbs && !protein) return null;

  const fatKcal = (fat?.value ?? 0) * 9;
  const carbsKcal = (carbs?.value ?? 0) * 4;
  const proteinKcal = (protein?.value ?? 0) * 4;
  const total = fatKcal + carbsKcal + proteinKcal;
  if (total <= 0) return null;

  return {
    fatKcal: round(fatKcal),
    carbsKcal: round(carbsKcal),
    proteinKcal: round(proteinKcal),
    fatPercent: Math.round((fatKcal / total) * 100),
    carbsPercent: Math.round((carbsKcal / total) * 100),
    proteinPercent: Math.round((proteinKcal / total) * 100),
  };
};

const mergeRecipes = (
  existing: SelectedRecipe[],
  newRecipes: SelectedRecipe[],
): SelectedRecipe[] => {
  const existingIds = new Set(existing.map((recipe) => recipe.id));
  const next = [...existing];
  for (const recipe of newRecipes) {
    if (existingIds.has(recipe.id)) continue;
    existingIds.add(recipe.id);
    next.push(recipe);
  }
  return next;
};

const readPresetRecipeIds = (state: object): string[] => {
  if (!("recipeIds" in state) || !Array.isArray(state.recipeIds)) return [];
  const ids: string[] = [];
  for (const id of state.recipeIds) {
    if (typeof id === "string") ids.push(id);
  }
  return ids;
};

const StepButton = ({
  ariaLabel,
  onClick,
  children,
}: {
  ariaLabel: string;
  onClick: () => void;
  children: ReactNode;
}) => (
  <Button
    variant="ghost"
    size="icon-lg"
    className="text-primary hover:text-primary"
    aria-label={ariaLabel}
    onClick={onClick}
  >
    {children}
  </Button>
);

export const NutritionCalculatorPage = () => {
  const { t } = useTranslation();
  const router = useRouter();

  const restored = snapshotStore.useRestoredSnapshot();

  const [presetRecipeIds] = useState(() =>
    readPresetRecipeIds(router.state.location.state),
  );

  const [recipes, setRecipes] = useState<SelectedRecipe[]>(
    () => restored?.recipes ?? [],
  );
  const [nutritionById, setNutritionById] = useState(
    () => new Map<string, RecipeSummary>(restored?.nutritionById),
  );
  const [servingsDrafts, setServingsDrafts] = useState<
    Record<string, string | undefined>
  >({});
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    () => restored?.displayMode ?? "total",
  );
  const [bulkServings, setBulkServings] = useState(
    () => restored?.bulkServings ?? "1",
  );
  const [divideAmongText, setDivideAmongText] = useState(
    () => restored?.divideAmong ?? "1",
  );
  const [divideAmongTouched, setDivideAmongTouched] = useState(
    () => restored?.divideAmongTouched ?? false,
  );
  const [reloadPending, setReloadPending] = useState(false);

  const recipesRef = useRef<SelectedRecipe[]>(restored?.recipes ?? []);
  const nutritionRef = useRef(
    new Map<string, RecipeSummary>(restored?.nutritionById),
  );
  const initializedRef = useRef(false);

  snapshotStore.useSaveSnapshot({
    recipes,
    nutritionById,
    displayMode,
    bulkServings,
    divideAmong: divideAmongText,
    divideAmongTouched,
    reloadPending,
  });

  useEvent(RECIPE_CHANGE_EVENTS, () => {
    setReloadPending(true);
  });

  const commitRecipes = (next: SelectedRecipe[]) => {
    recipesRef.current = next;
    setRecipes(next);
  };

  const commitNutrition = () => {
    setNutritionById(new Map(nutritionRef.current));
  };

  const fetchNutritionForIds = async (ids: string[]): Promise<void> => {
    const missingIds = ids.filter((id) => !nutritionRef.current.has(id));

    for (let i = 0; i < missingIds.length; i += FETCH_CHUNK_SIZE) {
      const chunk = missingIds.slice(i, i + FETCH_CHUNK_SIZE);

      const response = await serverActions.recipes.getRecipesByIds({
        ids: chunk,
      });

      if (!response) continue;

      for (const recipe of response) {
        nutritionRef.current.set(recipe.id, recipe);
      }
    }
  };

  const reloadCachedRecipes = async () => {
    setLoadingRecipes(true);

    const ids = recipesRef.current.map((recipe) => recipe.id);
    const previousNutrition = new Map(
      ids.map((id) => [id, nutritionRef.current.get(id)]),
    );

    for (const id of ids) {
      nutritionRef.current.delete(id);
    }

    await fetchNutritionForIds(ids);

    for (const id of ids) {
      if (nutritionRef.current.has(id)) continue;
      const stale = previousNutrition.get(id);
      if (stale) nutritionRef.current.set(id, stale);
    }

    commitNutrition();
    setLoadingRecipes(false);
  };

  const loadPresetRecipes = async (ids: string[]) => {
    setLoadingRecipes(true);

    const counts = new Map<string, number>();
    const order: string[] = [];
    for (const id of ids) {
      if (!counts.has(id)) order.push(id);
      counts.set(id, (counts.get(id) || 0) + 1);
    }

    await fetchNutritionForIds(order);

    const newRecipes: SelectedRecipe[] = [];
    for (const id of order) {
      const nutrition = nutritionRef.current.get(id);
      if (!nutrition) continue;
      newRecipes.push({
        id,
        title: nutrition.title,
        servings: counts.get(id) || 1,
        servingSize: nutrition.nutritionServingSize,
      });
    }

    commitNutrition();
    commitRecipes(mergeRecipes(recipesRef.current, newRecipes));
    setLoadingRecipes(false);
  };

  const onMount = useEffectEvent(() => {
    if (restored) {
      if (restored.reloadPending && restored.recipes.length) {
        const loading = loadingService.start();
        void reloadCachedRecipes().finally(() => loading.dismiss());
      }
      return;
    }

    if (presetRecipeIds.length) {
      void loadPresetRecipes(presetRecipeIds);
    }
  });

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    onMount();
  }, []);

  const addRecipe = async () => {
    const data = await openSelectRecipeModal();
    if (!data) return;
    nutritionRef.current.set(data.id, data);
    commitNutrition();
    commitRecipes(
      mergeRecipes(recipesRef.current, [
        {
          id: data.id,
          title: data.title,
          servings: 1,
          servingSize: data.nutritionServingSize,
        },
      ]),
    );
  };

  const addRecipesFromLabel = async (labelTitle: string) => {
    setLoadingRecipes(true);

    const collected = new Map<string, SelectedRecipe>();
    let offset = 0;
    while (true) {
      const response = await serverActions.recipes.getRecipes({
        folder: "main",
        orderBy: "title",
        orderDirection: "asc",
        offset,
        limit: RECIPE_PAGE_SIZE,
        labels: [labelTitle],
      });
      if (!response) break;

      for (const recipe of response.recipes) {
        collected.set(recipe.id, {
          id: recipe.id,
          title: recipe.title,
          servings: 1,
          servingSize: null,
        });
      }
      offset += response.recipes.length;

      if (response.recipes.length === 0 || offset >= response.totalCount) {
        break;
      }
    }

    commitRecipes(mergeRecipes(recipesRef.current, [...collected.values()]));

    await fetchNutritionForIds(recipesRef.current.map((recipe) => recipe.id));

    commitRecipes(
      recipesRef.current.map((recipe) => {
        const nutrition = nutritionRef.current.get(recipe.id);
        if (nutrition && recipe.servingSize === null) {
          return { ...recipe, servingSize: nutrition.nutritionServingSize };
        }
        return recipe;
      }),
    );
    commitNutrition();
    setLoadingRecipes(false);
  };

  const addLabel = async () => {
    const data = await openSelectLabelModal();
    if (!data) return;
    await addRecipesFromLabel(data.title);
  };

  const removeRecipe = (recipe: SelectedRecipe) => {
    commitRecipes(recipesRef.current.filter((item) => item.id !== recipe.id));
  };

  const setRecipeServings = (id: string, servings: number) => {
    commitRecipes(
      recipesRef.current.map((recipe) =>
        recipe.id === id ? { ...recipe, servings } : recipe,
      ),
    );
    setServingsDrafts((prev) => ({ ...prev, [id]: undefined }));
  };

  const clampServings = (recipe: SelectedRecipe) => {
    const raw = servingsDrafts[recipe.id] ?? recipe.servings;
    setRecipeServings(
      recipe.id,
      clampServingsValue(toServingsNumber(raw) ?? NaN, 0),
    );
  };

  const stepServings = (recipe: SelectedRecipe, delta: number) => {
    const raw = servingsDrafts[recipe.id] ?? recipe.servings;
    setRecipeServings(
      recipe.id,
      clampServingsValue((toServingsNumber(raw) ?? 0) + delta, 0),
    );
  };

  const setAllServings = (value: number) => {
    commitRecipes(
      recipesRef.current.map((recipe) => ({ ...recipe, servings: value })),
    );
    setServingsDrafts({});
  };

  const onBulkServingsInput = (text: string) => {
    setBulkServings(text);
    const raw = toServingsNumber(text);
    if (raw === null) return;
    setAllServings(clampServingsValue(raw, 0));
  };

  const clampBulkServings = () => {
    const value = clampServingsValue(toServingsNumber(bulkServings) ?? 0, 0);
    setBulkServings(String(value));
    setAllServings(value);
  };

  const stepBulkServings = (delta: number) => {
    const value = clampServingsValue(
      (toServingsNumber(bulkServings) ?? 0) + delta,
      0,
    );
    setBulkServings(String(value));
    setAllServings(value);
  };

  const totalServings = recipes.reduce(
    (acc, recipe) => acc + (recipe.servings || 0),
    0,
  );

  const divideAmong = divideAmongTouched
    ? divideAmongText
    : String(totalServings || 1);
  const divisor = averageDivisorFor(divideAmong);

  const onDivideAmongInput = (text: string) => {
    setDivideAmongTouched(true);
    setDivideAmongText(text);
  };

  const clampDivideAmong = () => {
    setDivideAmongTouched(true);
    setDivideAmongText(String(averageDivisorFor(divideAmong)));
  };

  const fields = useMemo((): AggregateField[] => {
    const recipeCount = recipes.length;
    const result: AggregateField[] = [];
    for (const def of NUTRITION_FIELDS) {
      let sum = 0;
      let presentCount = 0;
      for (const recipe of recipes) {
        const nutrition = nutritionById.get(recipe.id);
        const value = nutrition ? nutrition[def.key] : null;
        if (value === null || value === undefined) continue;
        sum += value * (recipe.servings || 0);
        presentCount += 1;
      }

      if (presentCount === 0) continue;

      const displayed = displayMode === "perServing" ? sum / divisor : sum;

      const dv = DAILY_VALUES[def.key];
      const dvPercent =
        dv !== undefined && dv > 0 ? Math.round((displayed / dv) * 100) : null;

      result.push({
        key: def.key,
        unit: def.unit,
        indent: def.indent ?? false,
        value: round(displayed),
        dvPercent,
        presentCount,
        missingCount: recipeCount - presentCount,
      });
    }
    return result;
  }, [recipes, nutritionById, displayMode, divisor]);

  const macros = computeMacros(fields);
  const nutrientsPresentCount = fields.length;
  const totalNutrientCount = NUTRITION_FIELDS.length;
  const recipesWithDataCount = recipes.filter((recipe) =>
    recipeHasNutrition(nutritionById, recipe.id),
  ).length;

  const recipeHasNoNutrition = (recipe: SelectedRecipe): boolean =>
    nutritionById.has(recipe.id) &&
    !recipeHasNutrition(nutritionById, recipe.id);

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/tools" }} />}
        title={t("pages.nutritionCalculator.title")}
      />
      <PageContent padded={false}>
        <div className="mx-auto max-w-page pb-[25vh]">
          <InfoBlock
            className="m-4"
            icon={<HeartPulseIcon />}
            title={t("pages.nutritionCalculator.intro.title")}
          >
            <p>{t("pages.nutritionCalculator.intro.body")}</p>
          </InfoBlock>

          <section>
            <div className="flex flex-wrap items-center gap-2 px-4 pt-4 pb-2">
              <h2 className="me-auto text-lg font-semibold">
                {t("pages.nutritionCalculator.recipes.title")}
              </h2>
              <Button size="sm" onClick={() => void addRecipe()}>
                <PlusIcon data-icon="inline-start" />
                {t("pages.nutritionCalculator.addRecipe.title")}
              </Button>
              <Button size="sm" onClick={() => void addLabel()}>
                <TagIcon data-icon="inline-start" />
                {t("pages.nutritionCalculator.addLabel.title")}
              </Button>
            </div>

            {recipes.length > 0 && (
              <p className="px-4 py-1 text-[0.8rem] text-muted-foreground">
                {t("pages.nutritionCalculator.servings.help")}
              </p>
            )}

            {loadingRecipes && (
              <div className="flex items-center gap-4 px-4 py-3">
                <Spinner className="size-6" />
                <span>{t("pages.nutritionCalculator.recipes.loading")}</span>
              </div>
            )}

            {recipes.length > 0 ? (
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center px-4">
                <span />
                <span />
                <span className="pb-1 text-center text-[0.8rem] font-semibold text-muted-foreground">
                  {t("pages.nutritionCalculator.servings.label")}
                </span>

                {recipes.map((recipe) => (
                  <div key={recipe.id} className="contents">
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      className="text-destructive hover:text-destructive"
                      aria-label={t("pages.nutritionCalculator.recipes.remove")}
                      onClick={() => removeRecipe(recipe)}
                    >
                      <CircleMinusIcon className="size-5" />
                    </Button>
                    <div className="min-w-0 py-2 pe-2">
                      <Link
                        to="/recipe/$recipeId"
                        params={{ recipeId: recipe.id }}
                        dir="auto"
                        className="break-words text-primary no-underline hover:underline"
                      >
                        {recipe.title}
                      </Link>
                      {recipe.servingSize && (
                        <p
                          dir="auto"
                          className="mt-1 text-[0.85rem] text-muted-foreground"
                        >
                          {t("pages.nutritionCalculator.recipes.servingBasis", {
                            servingSize: recipe.servingSize,
                          })}
                        </p>
                      )}
                      {recipeHasNoNutrition(recipe) && (
                        <div className="mt-1">
                          <Badge className="bg-amber-400 text-black">
                            {t("pages.nutritionCalculator.recipes.noData")}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                      <StepButton
                        ariaLabel={t(
                          "pages.nutritionCalculator.servings.decrease",
                        )}
                        onClick={() => stepServings(recipe, -1)}
                      >
                        <MinusIcon className="size-5" />
                      </StepButton>
                      <input
                        className="h-9 w-12 bg-transparent p-0 text-center outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring/40"
                        type="text"
                        inputMode="decimal"
                        aria-label={t(
                          "pages.nutritionCalculator.servings.label",
                        )}
                        value={
                          servingsDrafts[recipe.id] ?? String(recipe.servings)
                        }
                        onChange={(event) => {
                          const value = event.target.value;
                          setServingsDrafts((prev) => ({
                            ...prev,
                            [recipe.id]: value,
                          }));
                        }}
                        onBlur={() => clampServings(recipe)}
                      />
                      <StepButton
                        ariaLabel={t(
                          "pages.nutritionCalculator.servings.increase",
                        )}
                        onClick={() => stepServings(recipe, 1)}
                      >
                        <PlusIcon className="size-5" />
                      </StepButton>
                    </div>
                    <hr className="col-span-full m-0 w-full border-0 border-b border-border" />
                  </div>
                ))}

                <span />
                <span className="p-2 text-end text-[0.85rem]">
                  {t("pages.nutritionCalculator.servings.setAll")}
                </span>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                  <StepButton
                    ariaLabel={t("pages.nutritionCalculator.servings.decrease")}
                    onClick={() => stepBulkServings(-1)}
                  >
                    <MinusIcon className="size-5" />
                  </StepButton>
                  <input
                    className="h-9 w-12 bg-transparent p-0 text-center outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring/40"
                    type="text"
                    inputMode="decimal"
                    aria-label={t("pages.nutritionCalculator.servings.setAll")}
                    value={bulkServings}
                    onChange={(event) =>
                      onBulkServingsInput(event.target.value)
                    }
                    onBlur={clampBulkServings}
                  />
                  <StepButton
                    ariaLabel={t("pages.nutritionCalculator.servings.increase")}
                    onClick={() => stepBulkServings(1)}
                  >
                    <PlusIcon className="size-5" />
                  </StepButton>
                </div>
              </div>
            ) : (
              !loadingRecipes && (
                <p className="px-4 py-3">
                  {t("pages.nutritionCalculator.recipes.empty")}
                </p>
              )
            )}
          </section>

          {fields.length > 0 && (
            <>
              <Tabs
                className="mt-5 px-4"
                value={displayMode}
                onValueChange={(value) => {
                  if (isDisplayMode(value)) setDisplayMode(value);
                }}
              >
                <TabsList className="h-auto min-h-10 w-full">
                  <TabsTrigger value="total" className="whitespace-normal">
                    {t("pages.nutritionCalculator.mode.total")}
                  </TabsTrigger>
                  <TabsTrigger value="perServing" className="whitespace-normal">
                    {t("pages.nutritionCalculator.mode.perServing")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-wrap gap-1.5 px-4 pt-3">
                <span className="inline-block rounded-xl border px-2.5 py-1 text-[0.8rem] text-muted-foreground">
                  {t("pages.nutritionCalculator.coverage.nutrients", {
                    present: nutrientsPresentCount,
                    total: totalNutrientCount,
                  })}
                </span>
                <span className="inline-block rounded-xl border px-2.5 py-1 text-[0.8rem] text-muted-foreground">
                  {t("pages.nutritionCalculator.coverage.recipes", {
                    withData: recipesWithDataCount,
                    total: recipes.length,
                  })}
                </span>
                <span className="inline-block rounded-xl border px-2.5 py-1 text-[0.8rem] text-muted-foreground">
                  {t("pages.nutritionCalculator.coverage.servings", {
                    servings: totalServings,
                  })}
                </span>
              </div>

              {macros && (
                <div className="m-4 rounded-lg border px-4 py-3">
                  <p className="mb-2 font-semibold">
                    {t("pages.nutritionCalculator.macros.title")}
                  </p>
                  <div className="flex h-4 w-full overflow-hidden rounded-lg bg-muted">
                    {macros.fatPercent > 0 && (
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${macros.fatPercent}%` }}
                      />
                    )}
                    {macros.carbsPercent > 0 && (
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${macros.carbsPercent}%` }}
                      />
                    )}
                    {macros.proteinPercent > 0 && (
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${macros.proteinPercent}%` }}
                      />
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[0.85rem]">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block size-3 rounded-[3px] bg-amber-400" />
                      {t("pages.nutritionCalculator.macros.fat", {
                        percent: macros.fatPercent,
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block size-3 rounded-[3px] bg-primary" />
                      {t("pages.nutritionCalculator.macros.carbs", {
                        percent: macros.carbsPercent,
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block size-3 rounded-[3px] bg-green-500" />
                      {t("pages.nutritionCalculator.macros.protein", {
                        percent: macros.proteinPercent,
                      })}
                    </span>
                  </div>
                </div>
              )}

              <div className="m-4 rounded-sm border-2 border-foreground px-4 py-3">
                <div className="mb-2 border-b-4 border-foreground pb-2">
                  <p className="text-[1.1rem] font-bold">
                    {displayMode === "total"
                      ? t("pages.nutritionCalculator.facts.titleTotal")
                      : t("pages.nutritionCalculator.facts.titlePerServing")}
                  </p>
                  {displayMode === "perServing" && (
                    <>
                      <div className="mt-[18px] max-w-[160px]">
                        <TextField
                          label={t(
                            "pages.nutritionCalculator.facts.divideAmong",
                          )}
                          inputMode="decimal"
                          value={divideAmong}
                          onValueChange={onDivideAmongInput}
                          onBlur={clampDivideAmong}
                        />
                      </div>
                      <p className="mt-1.5 text-[0.8rem] text-muted-foreground">
                        {t("pages.nutritionCalculator.facts.perServingBasis", {
                          servings: divisor,
                        })}
                      </p>
                    </>
                  )}
                  <p className="mt-2 text-end text-[0.75rem] font-bold">
                    {t("pages.nutritionCalculator.facts.dvHeader")}
                  </p>
                </div>

                {fields.map((field) => (
                  <div
                    key={field.key}
                    className={
                      field.indent ? "border-b py-1.5 ps-5" : "border-b py-1.5"
                    }
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="flex-1">
                        {t(NUTRITION_LABEL_KEYS[field.key])}
                      </span>
                      <span className="text-end font-semibold whitespace-nowrap">
                        {t(NUTRITION_UNIT_KEYS[field.unit], {
                          value: field.value,
                        })}
                      </span>
                      <span className="flex-[0_0_52px] text-end font-semibold whitespace-nowrap">
                        {field.dvPercent !== null &&
                          t("pages.nutritionCalculator.facts.dvValue", {
                            percent: field.dvPercent,
                          })}
                      </span>
                    </div>
                    {field.missingCount > 0 && (
                      <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
                        {t("pages.nutritionCalculator.facts.missing", {
                          missing: field.missingCount,
                          total: recipes.length,
                        })}
                      </p>
                    )}
                  </div>
                ))}

                <p className="mt-2.5 text-[0.7rem] text-muted-foreground">
                  {t("pages.nutritionCalculator.facts.dvFootnote")}
                </p>
              </div>
            </>
          )}
        </div>
      </PageContent>
    </>
  );
};
