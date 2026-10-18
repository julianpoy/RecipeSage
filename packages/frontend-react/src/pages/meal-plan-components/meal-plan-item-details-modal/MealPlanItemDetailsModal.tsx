import { useMemo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  CalendarIcon,
  CopyIcon,
  FileTextIcon,
  PinIcon,
  ShoppingCartIcon,
  SquarePenIcon,
  Trash2Icon,
  UserIcon,
  XIcon,
} from "lucide-react";
import type { MealPlanItemSummary } from "@recipesage/prisma";
import { inferRecipeNotation, parseNotes } from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CachedImage } from "../../../components/CachedImage";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { showAlert } from "../../../components/dialogs/showAlert";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { loadingService } from "../../../services/loadingService";
import { serverActions } from "../../../services/serverActions";
import { cookingToolbarStore } from "../../../stores/cookingToolbarStore";
import { getCurrentLocale } from "../../../utils/formatDate";
import { linkifyHtml } from "../../../utils/linkify";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";
import { openAddRecipeToShoppingListModal } from "../../recipe-components/add-recipe-to-shopping-list-modal/openAddRecipeToShoppingListModal";
import { openNewMealPlanItemModal } from "../new-meal-plan-item-modal/openNewMealPlanItemModal";

export interface MealPlanItemDetailsModalResult {
  refresh: boolean;
}

const formatDate = (date: Date | string | number) =>
  dayjs(date).format("YYYY-MM-DD");

const ActionButton = ({
  icon,
  destructive = false,
  onClick,
  children,
}: {
  icon: ReactNode;
  destructive?: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    className={cn(
      "flex min-h-12 w-full items-center gap-4 border-b px-4 py-2 text-start text-base hover:bg-muted [&_svg]:size-5 [&_svg]:shrink-0",
      destructive ? "text-destructive" : "[&_svg]:text-muted-foreground",
    )}
    onClick={onClick}
  >
    {icon}
    <span className="min-w-0 flex-1">{children}</span>
  </button>
);

export const MealPlanItemDetailsModal = ({
  controls,
  mealPlanId,
  mealItem,
  customMealOptions = null,
}: {
  controls: DialogControls<MealPlanItemDetailsModalResult>;
  mealPlanId: string;
  mealItem: MealPlanItemSummary;
  customMealOptions?: string | null;
}) => {
  const { t } = useTranslation();
  const recipe = mealItem.recipe;
  const isPinned = cookingToolbarStore((state) =>
    recipe
      ? state.pinnedRecipes.some((pinned) => pinned.id === recipe.id)
      : false,
  );

  const parsedNotes = useMemo(() => {
    if (!mealItem.notes) return [];
    return parseNotes(mealItem.notes, "1", {
      decimalNotationMode: inferRecipeNotation(
        { notes: mealItem.notes },
        getCurrentLocale(),
      ),
    }).map((note) => ({
      ...note,
      htmlContent: linkifyHtml(note.htmlContent),
    }));
  }, [mealItem.notes]);

  const close = (result?: MealPlanItemDetailsModalResult) => {
    controls.close(result);
  };

  const edit = async () => {
    const data = await openNewMealPlanItemModal({
      isEditing: true,
      inputType: recipe ? "recipe" : "manualEntry",
      title: mealItem.title,
      recipe,
      scheduledDate: mealItem.scheduled
        ? dayjs(mealItem.scheduled).format("YYYY-MM-DD")
        : mealItem.scheduledDate,
      meal: mealItem.meal,
      notes: mealItem.notes,
      customMealOptions,
    });
    const item = data?.items[0];
    if (!item) return;

    const loading = loadingService.start();

    const result = await serverActions.mealPlans.updateMealPlanItems({
      mealPlanId,
      items: [{ id: mealItem.id, ...item }],
    });
    loading.dismiss();
    if (!result) return;

    close({
      refresh: true,
    });
  };

  const clone = async () => {
    const data = await openNewMealPlanItemModal({
      isEditing: false,
      inputType: recipe ? "recipe" : "manualEntry",
      title: mealItem.title,
      recipe,
      scheduledDate: mealItem.scheduledDate,
      meal: mealItem.meal,
      notes: mealItem.notes,
      customMealOptions,
    });
    if (!data?.items.length) return;

    const loading = loadingService.start();

    const result = await serverActions.mealPlans.createMealPlanItems({
      mealPlanId,
      items: data.items,
    });

    loading.dismiss();
    if (!result) return;

    close({
      refresh: true,
    });
  };

  const _delete = async () => {
    const loading = loadingService.start();

    const result = await serverActions.mealPlans.deleteMealPlanItems({
      mealPlanId,
      ids: [mealItem.id],
    });
    loading.dismiss();
    if (!result) return;

    close({
      refresh: true,
    });
  };

  const deleteItem = () => {
    const title = (recipe || mealItem).title;
    void showAlert({
      header: t("pages.mealPlanItemDetailsModal.delete.header"),
      message: t("pages.mealPlanItemDetailsModal.delete.message", { title }),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
        },
        {
          text: t("generic.delete"),
          variant: "destructive",
          handler: () => {
            void _delete();
          },
        },
      ],
    });
  };

  const addToShoppingList = async () => {
    if (!recipe) return;

    const loading = loadingService.start();
    // Fetch complete recipe (this page is provided with only topical recipe details)
    const response = await serverActions.recipes.getRecipe({
      id: recipe.id,
    });
    loading.dismiss();

    if (response) {
      void openAddRecipeToShoppingListModal({
        recipes: [response],
      });
    }
  };

  const pinRecipe = () => {
    if (!recipe) return;

    cookingToolbarStore.getState().pinRecipe({
      id: recipe.id,
      title: recipe.title,
      imageUrl: recipe.recipeImages.at(0)?.image.location,
    });
  };

  const unpinRecipe = () => {
    if (!recipe) return;

    cookingToolbarStore.getState().unpinRecipe(recipe.id);
  };

  const recipeImageLocation = recipe?.recipeImages.at(0)?.image.location;

  const summaryContent = (
    <>
      {recipeImageLocation && (
        <CachedImage
          src={recipeImageLocation}
          className="size-10 shrink-0 rounded-full object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <h2 className="mb-1 text-2xl font-medium break-words">
          <span dir="auto">{mealItem.title}</span>
        </h2>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarIcon className="size-4 shrink-0" aria-hidden="true" />
          <span>
            {t("pages.mealPlanItemDetailsModal.scheduled", {
              meal: mealItem.meal,
              date: formatDate(mealItem.scheduledDate),
            })}
          </span>
        </p>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserIcon className="size-4 shrink-0" aria-hidden="true" />
          <span>
            {t("pages.mealPlanItemDetailsModal.lastModified", {
              name: mealItem.user.name,
              date: formatDate(mealItem.updatedAt),
            })}
          </span>
        </p>
        {recipe && (
          <p className="text-sm text-muted-foreground">
            {t("pages.mealPlanItemDetailsModal.clickToOpen")}
          </p>
        )}
      </div>
    </>
  );

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={null}
        title={t("pages.mealPlanItemDetailsModal.title")}
        end={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit"
            aria-label={t("generic.close")}
            onClick={() => close()}
          >
            <XIcon className="size-6" />
          </Button>
        }
      />
      <PageContent className="flex flex-col gap-4">
        {recipe ? (
          <Link
            to="/recipe/$recipeId"
            params={{ recipeId: recipe.id }}
            className="flex items-center gap-4 border-b px-4 py-3 hover:bg-muted"
            onClick={() => close()}
          >
            {summaryContent}
          </Link>
        ) : (
          <div className="flex items-center gap-4 border-b px-4 py-3">
            {summaryContent}
          </div>
        )}

        {parsedNotes.length > 0 && (
          <div className="px-4">
            <p className="mb-2 flex items-center gap-4 text-sm text-muted-foreground">
              <FileTextIcon className="size-5 shrink-0" aria-hidden="true" />
              {t("pages.mealPlanItemDetailsModal.notes")}
            </p>
            <div className="break-words">
              {parsedNotes.map((noteLine, idx) =>
                noteLine.isTable ? (
                  <div
                    key={idx}
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(noteLine.htmlContent),
                    }}
                  />
                ) : (
                  <p
                    key={idx}
                    dir="auto"
                    className={cn("mb-0.5", noteLine.isHeader && "font-bold")}
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(noteLine.htmlContent),
                    }}
                  />
                ),
              )}
            </div>
          </div>
        )}

        <div className="mt-4">
          {recipe?.id && (
            <ActionButton
              icon={<ShoppingCartIcon />}
              onClick={() => void addToShoppingList()}
            >
              {t("pages.mealPlanItemDetailsModal.actions.addToShoppingList")}
            </ActionButton>
          )}
          {recipe && recipe.id && (
            <ActionButton
              icon={<PinIcon />}
              onClick={() => (isPinned ? unpinRecipe() : pinRecipe())}
            >
              {isPinned
                ? t("pages.mealPlanItemDetailsModal.actions.unpinRecipe")
                : t("pages.mealPlanItemDetailsModal.actions.pinRecipe")}
            </ActionButton>
          )}
          <ActionButton icon={<SquarePenIcon />} onClick={() => void edit()}>
            {t("pages.mealPlanItemDetailsModal.actions.edit")}
          </ActionButton>
          <ActionButton icon={<CopyIcon />} onClick={() => void clone()}>
            {t("pages.mealPlanItemDetailsModal.actions.duplicate")}
          </ActionButton>
          <ActionButton icon={<Trash2Icon />} destructive onClick={deleteItem}>
            {t("pages.mealPlanItemDetailsModal.actions.delete")}
          </ActionButton>
        </div>
      </PageContent>
      <PageFooter className="p-4">
        <Button size="lg" className="w-full" onClick={() => close()}>
          <XIcon data-icon="inline-start" />
          {t("pages.mealPlanItemDetailsModal.actions.close")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
