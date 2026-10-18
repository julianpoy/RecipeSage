import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PinIcon, XIcon } from "lucide-react";
import type { MealPlanItemSummary } from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { cookingToolbarStore } from "../../../stores/cookingToolbarStore";

const getAllSelectedMap = (mealItems: MealPlanItemSummary[]) => {
  const selectionMap: Record<string, boolean | undefined> = {};
  for (const mealItem of mealItems) {
    if (mealItem.recipe) selectionMap[mealItem.recipe.id] = true;
  }
  return selectionMap;
};

export const MealPlanBulkPinModal = ({
  controls,
  mealItems,
}: {
  controls: DialogControls<void>;
  mealItems: MealPlanItemSummary[];
}) => {
  const { t } = useTranslation();
  const [allSelected, setAllSelected] = useState(true);
  const [recipeIdSelectionMap, setRecipeIdSelectionMap] = useState<
    Record<string, boolean | undefined>
  >(() => getAllSelectedMap(mealItems));

  const selectAllRecipes = () => {
    setAllSelected(true);
    setRecipeIdSelectionMap((prev) => ({
      ...prev,
      ...getAllSelectedMap(mealItems),
    }));
  };

  const deselectAll = () => {
    setAllSelected(false);
    setRecipeIdSelectionMap((prev) =>
      Object.fromEntries(
        Object.keys(prev).map((recipeId) => [recipeId, false]),
      ),
    );
  };

  const pinRecipes = () => {
    Object.keys(recipeIdSelectionMap).forEach((recipeId) => {
      if (!recipeIdSelectionMap[recipeId]) return;
      const mealItem = mealItems.find((item) => item.recipe?.id === recipeId);

      if (mealItem && mealItem.recipe) {
        cookingToolbarStore.getState().pinRecipe({
          id: mealItem.recipe.id,
          title: mealItem.recipe.title,
          imageUrl: mealItem.recipe.recipeImages.at(0)?.image.location,
        });
      }
    });
  };

  const close = () => {
    controls.close();
  };

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={null}
        title={t("pages.mealPlanBulkPinModal.title")}
        end={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit"
            aria-label={t("generic.close")}
            onClick={close}
          >
            <XIcon className="size-6" />
          </Button>
        }
      />
      <PageContent className="flex flex-col gap-4">
        <p>
          {t("pages.mealPlanBulkPinModal.instructions1")}
          <br />
          {t("pages.mealPlanBulkPinModal.instructions2")}
        </p>

        <div>
          {allSelected ? (
            <Button
              variant="ghost"
              className="text-primary"
              onClick={deselectAll}
            >
              {t("pages.mealPlanBulkPinModal.deselectAll")}
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="text-primary"
              onClick={selectAllRecipes}
            >
              {t("pages.mealPlanBulkPinModal.selectAll")}
            </Button>
          )}
        </div>

        <div>
          {mealItems.map((mealItem) => {
            const recipe = mealItem.recipe;
            return (
              <label
                key={mealItem.id}
                className={cn(
                  "flex min-h-12 items-center gap-4 border-b px-2 py-2",
                  recipe ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                )}
              >
                <Checkbox
                  className="size-5"
                  disabled={!recipe}
                  checked={!!recipe && !!recipeIdSelectionMap[recipe.id]}
                  onCheckedChange={(checked) => {
                    if (!recipe) return;
                    setRecipeIdSelectionMap((prev) => ({
                      ...prev,
                      [recipe.id]: checked,
                    }));
                  }}
                />
                <div className="min-w-0 flex-1">
                  <span dir="auto">{recipe?.title || mealItem.title}</span>
                  {!recipe && (
                    <p className="text-sm text-muted-foreground">
                      {t("pages.mealPlanBulkPinModal.notLinkedToRecipe")}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </PageContent>
      <PageFooter className="flex gap-2 p-4">
        <Button size="lg" className="flex-1 basis-0" onClick={close}>
          <XIcon data-icon="inline-start" />
          {t("pages.mealPlanBulkPinModal.cancel")}
        </Button>
        <Button
          size="lg"
          className="flex-1 basis-0"
          onClick={() => {
            pinRecipes();
            close();
          }}
        >
          <PinIcon data-icon="inline-start" />
          {t("pages.mealPlanBulkPinModal.pin")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
