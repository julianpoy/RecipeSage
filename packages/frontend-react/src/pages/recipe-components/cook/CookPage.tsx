import { useEffect, useMemo, useReducer, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CircleAlertIcon, XIcon } from "lucide-react";
import {
  applyDecimalNotation,
  CookModePreferenceKey,
  GlobalPreferenceKey,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { NullState } from "../../../components/NullState";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useActionQuery } from "../../../hooks/useActionQuery";
import { openScaleRecipe } from "../../../modals/scale-recipe/openScaleRecipe";
import type { UnitSystem } from "../../../modals/scale-recipe/ScaleRecipe";
import { fullscreenService } from "../../../services/fullscreenService";
import { recipeCompletionTrackerService } from "../../../services/recipeCompletionTrackerService";
import { serverActions } from "../../../services/serverActions";
import { wakeLockService } from "../../../services/wakeLockService";
import { preferencesStore } from "../../../stores/preferencesStore";
import { parseRecipeContent } from "../parseRecipeContent";
import { recipeContentClassName } from "../recipeContentClassName";
import { useLabeledPageTitle } from "../useLabeledPageTitle";

interface CookableRecipe {
  title: string;
  yield: string;
  ingredients: string;
  instructions: string;
  notes: string;
  images: { location: string; order: number }[];
}

const CookView = ({
  recipeId,
  isDiscover,
}: {
  recipeId: string;
  isDiscover: boolean;
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [notFound, setNotFound] = useState(false);
  const [scale, setScale] = useState(() =>
    recipeCompletionTrackerService.getRecipeScale(recipeId),
  );
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("original");
  const [, bumpCompletion] = useReducer((count: number) => count + 1, 0);

  const recipeQuery = useActionQuery<CookableRecipe>(
    [
      isDiscover ? "discover.getDiscoverRecipe" : "recipes.getRecipe",
      { id: recipeId },
      "cook",
    ],
    async () => {
      if (isDiscover) {
        const response = await serverActions.discover.getDiscoverRecipe(
          { id: recipeId },
          { 404: () => setNotFound(true) },
        );
        if (!response) return undefined;
        return {
          title: response.title,
          yield: response.yield,
          ingredients: response.ingredients,
          instructions: response.instructions,
          notes: response.notes,
          images: response.discoverRecipeImages.map((discoverRecipeImage) => ({
            location: discoverRecipeImage.image.location,
            order: discoverRecipeImage.order,
          })),
        };
      }

      const response = await serverActions.recipes.getRecipe(
        { id: recipeId },
        { 404: () => setNotFound(true) },
      );
      if (!response) return undefined;
      return {
        title: response.title,
        yield: response.yield,
        ingredients: response.ingredients,
        instructions: response.instructions,
        notes: response.notes,
        images: response.recipeImages.map((recipeImage) => ({
          location: recipeImage.image.location,
          order: recipeImage.order,
        })),
      };
    },
  );
  const recipe = recipeQuery.data;
  const loading = recipeQuery.isPending || (recipeQuery.isFetching && !recipe);

  useLabeledPageTitle(recipe?.title);

  useEffect(() => {
    let cancelled = false;
    let wakeLockRequest: { release: () => void } | undefined;
    void wakeLockService.request().then((request) => {
      if (cancelled) {
        request.release();
        return;
      }
      wakeLockRequest = request;
    });

    document.documentElement.style.fontSize =
      preferencesStore.getState().preferences[CookModePreferenceKey.FontSize];

    return () => {
      cancelled = true;
      wakeLockRequest?.release();
      document.documentElement.style.fontSize =
        preferencesStore.getState().preferences[GlobalPreferenceKey.FontSize];
      void fullscreenService.exit();
    };
  }, []);

  const parsed = useMemo(
    () =>
      recipe
        ? parseRecipeContent(recipe, scale, unitSystem, i18n.language)
        : undefined,
    [recipe, scale, unitSystem, i18n.language],
  );

  const decimalNotationMode = parsed?.decimalNotationMode ?? ".";
  const scaleDisplay = applyDecimalNotation(scale, decimalNotationMode);
  const ingredients = parsed?.ingredients;
  const instructions = parsed?.instructions;
  const notes = parsed?.notes;

  const load = () => {
    setNotFound(false);
    void recipeQuery.refetch();
  };

  const backToRecipes = () => {
    void navigate({
      to: "/list/$folder",
      params: { folder: "main" },
      replace: true,
    });
  };

  const exitCookMode = () => {
    if (isDiscover) {
      void navigate({
        to: "/discover/$discoverRecipeId",
        params: { discoverRecipeId: recipeId },
        replace: true,
      });
      return;
    }
    void navigate({
      to: "/recipe/$recipeId",
      params: { recipeId },
      replace: true,
    });
  };

  const changeScale = async () => {
    const data = await openScaleRecipe({
      scale: scale.toString(),
      unitSystem,
      yieldText: recipe?.yield ?? null,
      ingredients: ingredients ?? [],
      decimalNotationMode,
    });

    if (!data) return;

    if (data.scale) {
      setScale(data.scale);
      recipeCompletionTrackerService.setRecipeScale(recipeId, data.scale);
    }
    if (data.unitSystem) {
      setUnitSystem(data.unitSystem);
    }
  };

  const toggleIngredientComplete = (idx: number) => {
    recipeCompletionTrackerService.toggleIngredientComplete(recipeId, idx);
    bumpCompletion();
  };

  const toggleInstructionComplete = (idx: number) => {
    recipeCompletionTrackerService.toggleInstructionComplete(recipeId, idx);
    bumpCompletion();
  };

  return (
    <>
      <PageHeader
        start={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit"
            aria-label={t("generic.close")}
            onClick={exitCookMode}
          >
            <XIcon className="size-6" />
          </Button>
        }
        title={<span dir="auto">{recipe?.title}</span>}
        end={
          <Button
            variant="ghost"
            className="h-9 text-inherit hover:bg-white/10 hover:text-inherit"
            onClick={() => void changeScale()}
          >
            {t("pages.recipeDetails.scaleStatus", { scale: scaleDisplay })}
          </Button>
        }
      />
      <PageContent>
        {loading && (
          <NullState icon={<Spinner />}>
            <p className="text-muted-foreground">{t("pages.cook.loading")}</p>
          </NullState>
        )}
        {!loading && !recipe && (
          <NullState icon={<CircleAlertIcon />}>
            {notFound ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-muted-foreground">
                  {t("pages.cook.notFound")}
                </p>
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-primary"
                  onClick={backToRecipes}
                >
                  {t("pages.cook.backToRecipes")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <p className="text-muted-foreground">
                  {t("pages.cook.loadFailed")}
                </p>
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-primary"
                  onClick={load}
                >
                  {t("generic.retry")}
                </Button>
              </div>
            )}
          </NullState>
        )}
        {recipe && (
          <div className={cn("mx-auto max-w-[1250px]", recipeContentClassName)}>
            <div className="flex flex-wrap gap-6 md:flex-nowrap">
              <section className="w-full shrink-0 md:w-[320px]">
                <h2 className="mb-3 text-2xl font-bold">
                  {t("pages.recipeDetails.ingredients")}
                </h2>
                {ingredients?.map((ingredient, idx) => (
                  <p
                    key={idx}
                    dir="auto"
                    className={cn(
                      "m-0 py-2.5 leading-[1.4]",
                      ingredient.isHeader && "mt-2 mb-1 first:mt-0",
                      !ingredient.isHeader && "cursor-pointer",
                      recipeCompletionTrackerService.getIngredientComplete(
                        recipeId,
                        idx,
                      ) && "line-through opacity-70",
                    )}
                    onClick={() => {
                      if (ingredient.isHeader) return;
                      toggleIngredientComplete(idx);
                    }}
                    dangerouslySetInnerHTML={{
                      __html: ingredient.htmlContent,
                    }}
                  />
                ))}
                {(!ingredients || ingredients.length === 0) && (
                  <p>{t("pages.recipeDetails.noIngredients")}</p>
                )}
              </section>

              <section className="min-w-full grow md:min-w-0">
                <h2 className="mb-3 text-2xl font-bold">
                  {t("pages.recipeDetails.instructions")}
                </h2>
                {instructions?.map((instruction, idx) => (
                  <p
                    key={idx}
                    dir="auto"
                    className="group/instruction m-0 py-2.5 leading-normal"
                  >
                    {instruction.isHeader ? (
                      <span
                        dir="auto"
                        className="mt-2 mb-1 block font-bold group-first/instruction:mt-0"
                        dangerouslySetInnerHTML={{
                          __html: instruction.htmlContent,
                        }}
                      />
                    ) : (
                      <span
                        dir="auto"
                        onClick={() => toggleInstructionComplete(idx)}
                      >
                        <b>{instruction.count} &nbsp;</b>
                        <span
                          dir="auto"
                          className={cn(
                            "cursor-pointer",
                            recipeCompletionTrackerService.getInstructionComplete(
                              recipeId,
                              idx,
                            ) && "line-through opacity-70",
                          )}
                          dangerouslySetInnerHTML={{
                            __html: instruction.htmlContent,
                          }}
                        />
                      </span>
                    )}
                  </p>
                ))}
                {(!instructions || instructions.length === 0) && (
                  <p>{t("pages.recipeDetails.noInstructions")}</p>
                )}
              </section>
            </div>

            {notes && notes.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-3 text-2xl font-bold">
                  {t("pages.recipeDetails.notes")}
                </h2>
                {notes.map((note, idx) =>
                  note.isTable ? (
                    <div
                      key={idx}
                      dir="auto"
                      dangerouslySetInnerHTML={{
                        __html: note.htmlContent,
                      }}
                    />
                  ) : (
                    <p
                      key={idx}
                      dir="auto"
                      className={cn("my-4", note.isHeader && "font-bold")}
                      dangerouslySetInnerHTML={{
                        __html: note.htmlContent,
                      }}
                    />
                  ),
                )}
              </section>
            )}
          </div>
        )}
      </PageContent>
    </>
  );
};

export const CookPage = ({
  recipeId,
  isDiscover,
}: {
  recipeId: string;
  isDiscover: boolean;
}) => (
  <CookView
    key={`${isDiscover ? "discover" : "recipe"}:${recipeId}`}
    recipeId={recipeId}
    isDiscover={isDiscover}
  />
);
