import { useEffect, useMemo, useReducer, useState } from "react";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  BookOpenIcon,
  CalendarIcon,
  CloudDownloadIcon,
  CopyIcon,
  FileTextIcon,
  FlashlightIcon,
  LinkIcon,
  ListIcon,
  PencilIcon,
  PinIcon,
  PrinterIcon,
  ShareIcon,
  Trash2Icon,
} from "lucide-react";
import type { RecipeSummary } from "@recipesage/prisma";
import {
  applyDecimalNotation,
  RecipeDetailsPreferenceKey,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CachedImage } from "../../../components/CachedImage";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import { openDialog } from "../../../components/dialogs/openDialog";
import { showAlert } from "../../../components/dialogs/showAlert";
import { showToast } from "../../../components/dialogs/showToast";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useActionQuery } from "../../../hooks/useActionQuery";
import { useIsLoggedIn } from "../../../hooks/useIsLoggedIn";
import { useOfflineFirstQuery } from "../../../hooks/useOfflineFirstQuery";
import type { TranslationKey } from "../../../i18n/TranslationKey";
import { openImageViewer } from "../../../modals/image-viewer/openImageViewer";
import { openScaleRecipe } from "../../../modals/scale-recipe/openScaleRecipe";
import type { UnitSystem } from "../../../modals/scale-recipe/ScaleRecipe";
import { fullscreenService } from "../../../services/fullscreenService";
import { loadingService } from "../../../services/loadingService";
import { recipeCompletionTrackerService } from "../../../services/recipeCompletionTrackerService";
import { serverActions } from "../../../services/serverActions";
import { wakeLockService } from "../../../services/wakeLockService";
import { cookingToolbarStore } from "../../../stores/cookingToolbarStore";
import { preferencesStore } from "../../../stores/preferencesStore";
import { formatDate } from "../../../utils/formatDate";
import { AuthView } from "../../auth/AuthView";
import { openShareModal } from "../../share-modal/openShareModal";
import { openAddRecipeToMealPlanModal } from "../add-recipe-to-meal-plan-modal/openAddRecipeToMealPlanModal";
import { openAddRecipeToShoppingListModal } from "../add-recipe-to-shopping-list-modal/openAddRecipeToShoppingListModal";
import { parseRecipeContent } from "../parseRecipeContent";
import { openPrintRecipeModal } from "../print-recipe-modal/openPrintRecipeModal";
import {
  RecipeDetailsPopover,
  type RecipeDetailsPopoverActionTypes,
} from "../recipe-details-popover/RecipeDetailsPopover";
import { recipeContentClassName } from "../recipeContentClassName";
import { useLabeledPageTitle } from "../useLabeledPageTitle";
import { RecipeLabels } from "./RecipeLabels";
import { RecipeLinkList } from "./RecipeLinkList";
import { RecipeMeta } from "./RecipeMeta";
import { RecipeNutrition, recipeHasNutrition } from "./RecipeNutrition";
import { RecipeSectionTitle } from "./RecipeSectionTitle";

const routeApi = getRouteApi("/recipe/$recipeId");

const UNIT_SYSTEM_I18N_KEYS: Record<UnitSystem, TranslationKey> = {
  original: "components.scaleRecipe.system.original",
  metric: "components.scaleRecipe.system.metric",
  imperial: "components.scaleRecipe.system.imperial",
};

const getRecipeFolder = (recipe: Pick<RecipeSummary, "folder">) =>
  recipe.folder === "inbox" ? "inbox" : "main";

const getRecipeLinkUrl = (recipe: Pick<RecipeSummary, "url">) => {
  const url = recipe.url?.trim() || "";
  const isAlreadyNavigable =
    /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ||
    /^(mailto|tel):/i.test(url) ||
    url.startsWith("//");
  return !url || isAlreadyNavigable ? url : `http://${url}`;
};

const openAuthModal = (startWithRegister: boolean) =>
  openDialog<void>((controls) => (
    <ModalDialog controls={controls}>
      <AuthView
        startWithRegister={startWithRegister}
        modal={{ close: () => controls.close() }}
      />
    </ModalDialog>
  ));

const RecipeDetails = ({ recipeId }: { recipeId: string }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isLoggedIn = useIsLoggedIn();

  const [scale, setScale] = useState(
    () => recipeCompletionTrackerService.getRecipeScale(recipeId) || "1",
  );
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("original");
  const [, bumpCompletion] = useReducer((count: number) => count + 1, 0);

  const meQuery = useOfflineFirstQuery(
    serverActions.users.getMe({ 401: () => {} }),
  );
  const me = meQuery.data;

  const recipeQuery = useActionQuery(
    ["recipes.getRecipe", { id: recipeId }],
    () => serverActions.recipes.getRecipe({ id: recipeId }),
  );
  const recipe = recipeQuery.data;

  const similarRecipesQuery = useActionQuery(
    ["recipes.getSimilarRecipes", { recipeIds: [recipeId] }],
    () => serverActions.recipes.getSimilarRecipes({ recipeIds: [recipeId] }),
    { enabled: isLoggedIn },
  );

  const isFetching = recipeQuery.isFetching || similarRecipesQuery.isFetching;
  useEffect(() => {
    if (!isFetching) return;
    const loading = loadingService.start();
    return () => loading.dismiss();
  }, [isFetching]);

  const enableWakeLock = preferencesStore(
    (state) => state.preferences[RecipeDetailsPreferenceKey.EnableWakeLock],
  );
  useEffect(() => {
    if (!enableWakeLock) return;
    let cancelled = false;
    let wakeLockRequest: { release: () => void } | undefined;
    void wakeLockService.request().then((request) => {
      if (cancelled) {
        request.release();
        return;
      }
      wakeLockRequest = request;
    });
    return () => {
      cancelled = true;
      wakeLockRequest?.release();
    };
  }, [enableWakeLock]);

  const isPinned = cookingToolbarStore((state) =>
    state.pinnedRecipes.some((pinnedRecipe) => pinnedRecipe.id === recipeId),
  );

  useLabeledPageTitle(recipe?.title);

  const sortedRecipeImages = useMemo(
    () =>
      recipe ? [...recipe.recipeImages].sort((a, b) => a.order - b.order) : [],
    [recipe],
  );

  const parsed = useMemo(
    () =>
      recipe
        ? parseRecipeContent(
            {
              ingredients: recipe.ingredients,
              instructions: recipe.instructions,
              notes: recipe.notes,
              images: recipe.recipeImages.map((recipeImage) => ({
                location: recipeImage.image.location,
                order: recipeImage.order,
              })),
            },
            scale,
            unitSystem,
            i18n.language,
          )
        : undefined,
    [recipe, scale, unitSystem, i18n.language],
  );

  const similarRecipes = useMemo(
    () =>
      (similarRecipesQuery.data || []).map((similarRecipe) => ({
        id: similarRecipe.id,
        title: similarRecipe.title,
        imageLocation: [...similarRecipe.recipeImages]
          .sort((a, b) => a.order - b.order)
          .at(0)?.image.location,
      })),
    [similarRecipesQuery.data],
  );

  const linkedRecipes = useMemo(
    () =>
      recipe && "recipeLinks" in recipe
        ? recipe.recipeLinks.map((link) => ({
            id: link.linkedRecipe.id,
            title: link.linkedRecipe.title,
            imageLocation: link.linkedRecipe.recipeImages.at(0)?.image.location,
          }))
        : [],
    [recipe],
  );

  const isOwner = !!recipe && recipe.userId === me?.id;
  const decimalNotationMode = parsed?.decimalNotationMode ?? ".";
  const scaleDisplay = applyDecimalNotation(scale, decimalNotationMode);

  const changeScale = async () => {
    const data = await openScaleRecipe({
      scale: scale.toString(),
      unitSystem,
      yieldText: recipe?.yield ?? null,
      ingredients: parsed?.ingredients ?? [],
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

  const editRecipe = () => {
    void navigate({
      to: "/edit-recipe/$recipeId",
      params: { recipeId },
    });
  };

  const publishToDiscover = async () => {
    if (!recipe) return;

    if (recipe.source?.trim() || recipe.url?.trim()) {
      await showAlert({
        header: t("pages.publishDiscoverRecipe.ineligible.header"),
        message: t("pages.publishDiscoverRecipe.ineligible.message"),
        buttons: [
          {
            text: t("generic.okay"),
            role: "cancel",
          },
        ],
      });
      return;
    }

    void navigate({
      to: "/recipe/$recipeId/publish",
      params: { recipeId: recipe.id },
    });
  };

  const performDeleteRecipe = async () => {
    if (!recipe) return;

    const loading = loadingService.start();

    const response = await serverActions.recipes.deleteRecipe({
      id: recipe.id,
    });

    loading.dismiss();
    if (!response) return;

    cookingToolbarStore.getState().unpinRecipe(recipe.id);

    void navigate({
      to: "/list/$folder",
      params: { folder: recipe.folder },
      replace: true,
    });
  };

  const deleteRecipe = async () => {
    await showAlert({
      header: t("pages.recipeDetails.delete.header"),
      message: t("pages.recipeDetails.delete.message"),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
        },
        {
          text: t("generic.delete"),
          variant: "destructive",
          handler: () => {
            void performDeleteRecipe();
          },
        },
      ],
    });
  };

  const setLastMadeToday = async () => {
    if (!recipe) return;

    const loading = loadingService.start();

    const lastMadeAt = dayjs().format("YYYY-MM-DD");

    const response = await serverActions.recipes.updateRecipe({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      yield: recipe.yield,
      activeTime: recipe.activeTime,
      totalTime: recipe.totalTime,
      source: recipe.source,
      url: recipe.url,
      notes: recipe.notes,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      rating: recipe.rating || null,
      folder: getRecipeFolder(recipe),
      imageIds: recipe.recipeImages.map((recipeImage) => recipeImage.image.id),
      labelIds: recipe.recipeLabels.map((recipeLabel) => recipeLabel.label.id),
      lastMadeAt,
    });

    loading.dismiss();

    if (!response) return;

    void recipeQuery.refetch();
    showToast({
      message: t("pages.recipeDetails.lastMadeAtUpdated"),
      duration: 2000,
    });
  };

  const addRecipeToShoppingList = () => {
    if (!recipe) return;
    void openAddRecipeToShoppingListModal({
      recipes: [recipe],
      scale,
      unitSystem,
    });
  };

  const addRecipeToMealPlan = () => {
    if (!recipe) return;
    void openAddRecipeToMealPlanModal({ recipe });
  };

  const printRecipe = () => {
    if (!recipe) return;
    void openPrintRecipeModal({
      recipeId: recipe.id,
      scale,
      unitSystem,
    });
  };

  const shareRecipe = () => {
    if (!recipe) return;
    void openShareModal({ recipe });
  };

  const moveToFolder = async (folderName: "main" | "inbox") => {
    if (!recipe) return;

    const loading = loadingService.start();

    const response = await serverActions.recipes.updateRecipe({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      yield: recipe.yield,
      activeTime: recipe.activeTime,
      totalTime: recipe.totalTime,
      source: recipe.source,
      url: recipe.url,
      notes: recipe.notes,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      rating: recipe.rating || null,
      folder: folderName,
      labelIds: recipe.recipeLabels.map((recipeLabel) => recipeLabel.label.id),
      imageIds: recipe.recipeImages.map((recipeImage) => recipeImage.imageId),
    });

    loading.dismiss();
    if (!response) return;

    void recipeQuery.refetch();
    void similarRecipesQuery.refetch();
  };

  const cloneRecipe = async () => {
    if (!recipe) return false;

    const loading = loadingService.start();

    const labelIds =
      recipe.userId === me?.id
        ? recipe.recipeLabels.map((recipeLabel) => recipeLabel.label.id)
        : [];

    const response = await serverActions.recipes.createRecipe({
      title: recipe.title,
      description: recipe.description,
      yield: recipe.yield,
      activeTime: recipe.activeTime,
      totalTime: recipe.totalTime,
      source: recipe.source,
      url: recipe.url,
      notes: recipe.notes,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      rating: recipe.rating || null,
      folder: getRecipeFolder(recipe),
      labelIds,
      imageIds: recipe.recipeImages.map((recipeImage) => recipeImage.imageId),
    });

    loading.dismiss();
    if (!response) return false;

    void navigate({
      to: "/recipe/$recipeId",
      params: { recipeId: response.id },
    });

    return true;
  };

  const authAndClone = async () => {
    await openAuthModal(!isLoggedIn);

    const success = await cloneRecipe();
    if (!success) return;

    showToast({
      message: t("pages.recipeDetails.cloned"),
      duration: 5000,
    });
  };

  const openRecipeImageViewer = () => {
    if (!recipe) return;

    void openImageViewer({
      imageUrls: sortedRecipeImages.map(
        (recipeImage) => recipeImage.image.location,
      ),
    });
  };

  const pinRecipe = () => {
    if (!recipe) return;

    cookingToolbarStore.getState().pinRecipe({
      id: recipe.id,
      title: recipe.title,
      imageUrl: sortedRecipeImages.at(0)?.image.location || undefined,
    });
  };

  const unpinRecipe = () => {
    if (!recipe) return;

    cookingToolbarStore.getState().unpinRecipe(recipe.id);
  };

  const enterCookMode = async () => {
    await fullscreenService.request();
    void navigate({
      to: "/recipe/$recipeId/cook",
      params: { recipeId },
    });
  };

  const onPopoverAction = (action: RecipeDetailsPopoverActionTypes) => {
    switch (action) {
      case "updateWakeLock":
        return;
      case "enterCookMode":
        return void enterCookMode();
      case "addToShoppingList":
        return addRecipeToShoppingList();
      case "addToMealPlan":
        return addRecipeToMealPlan();
      case "share":
        return shareRecipe();
      case "print":
        return printRecipe();
      case "unpin":
        return unpinRecipe();
      case "pin":
        return pinRecipe();
      case "edit":
        return editRecipe();
      case "clone":
        return void cloneRecipe();
      case "authAndClone":
        return void authAndClone();
      case "moveToMain":
        return void moveToFolder("main");
      case "delete":
        return void deleteRecipe();
      case "setLastMadeToday":
        return void setLastMadeToday();
      case "publishToDiscover":
        return void publishToDiscover();
      default: {
        const exhaustiveCheck: never = action;
        throw new Error(`Unhandled action case: ${exhaustiveCheck}`);
      }
    }
  };

  const hasMeta =
    !!recipe &&
    !!(
      recipe.rating ||
      recipe.source ||
      recipe.url ||
      recipe.activeTime ||
      recipe.totalTime ||
      recipe.yield
    );

  const recipeLinkUrl = recipe ? getRecipeLinkUrl(recipe) : "";
  const firstImage = sortedRecipeImages.at(0);
  const ingredients = parsed?.ingredients;
  const instructions = parsed?.instructions;
  const notes = parsed?.notes;

  return (
    <>
      <PageHeader
        start={
          <BackButton
            fallback={{ to: "/list/$folder", params: { folder: "main" } }}
          />
        }
        title={t("pages.recipeDetails.pageTitle")}
        end={
          <RecipeDetailsPopover
            recipe={recipe}
            me={me}
            isLoggedIn={isLoggedIn}
            onAction={onPopoverAction}
          />
        }
      />
      <PageContent>
        {recipe && (
          <div className="mx-auto max-w-[1250px]">
            <div className="flex items-center gap-4 px-4 py-2">
              {firstImage && (
                <button
                  type="button"
                  className="mt-4 size-20 shrink-0 min-[641px]:size-[200px] cursor-pointer overflow-hidden rounded-sm shadow-[1px_1px_5px_rgba(0,0,0,0.35)] focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
                  onClick={openRecipeImageViewer}
                >
                  <CachedImage
                    src={firstImage.image.location}
                    alt={recipe.title}
                    className="size-full rounded-sm object-cover"
                  />
                </button>
              )}
              <div dir="auto" className="min-w-0 flex-1">
                <h2 className="text-lg font-medium break-words">
                  {recipe.title}
                </h2>
                {hasMeta && (
                  <RecipeMeta
                    recipe={recipe}
                    recipeLinkUrl={recipeLinkUrl}
                    truncateUrl
                    className="max-[640px]:hidden"
                  />
                )}
                <p
                  dir="auto"
                  className="text-sm break-words text-foreground/80"
                >
                  {recipe.description}
                </p>
              </div>
            </div>
            {hasMeta && (
              <div className="px-4 min-[641px]:hidden">
                <RecipeMeta
                  recipe={recipe}
                  recipeLinkUrl={recipeLinkUrl}
                  truncateUrl={false}
                />
              </div>
            )}
            {recipe.folder === "inbox" && recipe.fromUser && (
              <div className="px-4 py-2 text-sm">
                <p className="break-words">
                  <b>
                    {t("pages.recipeDetails.sentBy", {
                      name: recipe.fromUser.name,
                    })}
                  </b>
                  <br />
                  {t("pages.recipeDetails.sentByAction")}
                  <br />
                  <br />
                </p>
              </div>
            )}
            <br />
            <div className="flex flex-wrap min-[576px]:flex-nowrap">
              <div className="w-full max-w-full shrink-0 min-[576px]:w-[215px] min-[1000px]:w-[275px] min-[1200px]:w-[325px]">
                <RecipeSectionTitle icon={<BookOpenIcon />}>
                  {t("pages.recipeDetails.ingredients")}
                </RecipeSectionTitle>
                <div
                  dir="auto"
                  className={cn(
                    "px-4 py-2 text-sm break-words text-foreground/80",
                    recipeContentClassName,
                  )}
                >
                  {ingredients?.map((ingredient, idx) => (
                    <p
                      key={idx}
                      dir="auto"
                      className={cn(
                        "mb-0.5",
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
                  <p>
                    <button
                      type="button"
                      className="cursor-pointer text-primary underline-offset-4 hover:underline"
                      onClick={() => void changeScale()}
                    >
                      {t("pages.recipeDetails.scaleStatus", {
                        scale: scaleDisplay,
                      })}{" "}
                      · {t(UNIT_SYSTEM_I18N_KEYS[unitSystem])}
                    </button>
                  </p>
                  <br />
                </div>
              </div>
              <div className="min-w-full grow min-[576px]:min-w-0">
                <RecipeSectionTitle icon={<ListIcon />}>
                  {t("pages.recipeDetails.instructions")}
                </RecipeSectionTitle>
                <div
                  dir="auto"
                  className={cn(
                    "px-4 py-2 text-sm break-words text-foreground/80",
                    recipeContentClassName,
                  )}
                >
                  {instructions?.map((instruction, idx) => (
                    <p
                      key={idx}
                      dir="auto"
                      className="group/instruction mb-4 max-w-[900px]"
                    >
                      {instruction.isHeader ? (
                        <span
                          dir="auto"
                          className="block pt-2 pb-1 group-first/instruction:pt-0"
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
                </div>
              </div>
            </div>
            {notes && (
              <div className="mt-4">
                <RecipeSectionTitle icon={<FileTextIcon />}>
                  {t("pages.recipeDetails.notes")}
                </RecipeSectionTitle>
                <div
                  dir="auto"
                  className={cn(
                    "px-4 py-2 text-sm break-words text-foreground/80",
                    recipeContentClassName,
                  )}
                >
                  {notes.map((note, idx) =>
                    note.isTable ? (
                      <div
                        key={idx}
                        dangerouslySetInnerHTML={{
                          __html: note.htmlContent,
                        }}
                      />
                    ) : (
                      <p
                        key={idx}
                        dir="auto"
                        className={cn("mb-0.5", note.isHeader && "font-bold")}
                        dangerouslySetInnerHTML={{
                          __html: note.htmlContent,
                        }}
                      />
                    ),
                  )}
                  {notes.length === 0 && (
                    <p>{t("pages.recipeDetails.noNotes")}</p>
                  )}
                </div>
              </div>
            )}
            {recipeHasNutrition(recipe) && <RecipeNutrition recipe={recipe} />}
            {linkedRecipes.length > 0 && (
              <>
                <br />
                <RecipeLinkList
                  icon={<LinkIcon />}
                  title={t("pages.recipeDetails.linkedRecipes")}
                  recipes={linkedRecipes}
                />
              </>
            )}
            {recipe.folder !== "inbox" && recipe.recipeLabels.length > 0 && (
              <>
                <br />
                <RecipeLabels
                  recipeLabels={recipe.recipeLabels}
                  isOwner={isOwner}
                />
              </>
            )}
            <br />
            {similarRecipes.length > 0 && (
              <>
                <br />
                <RecipeLinkList
                  icon={<FlashlightIcon />}
                  title={t("pages.recipeDetails.similar")}
                  recipes={similarRecipes}
                />
              </>
            )}
            {isOwner && recipe.folder === "inbox" && (
              <div className="flex flex-col gap-4 p-4 print:hidden">
                <p className="text-sm text-muted-foreground">
                  {t("pages.recipeDetails.inInbox")}
                </p>
                <div className="grid gap-3 lg:grid-cols-2">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => void moveToFolder("main")}
                  >
                    <CloudDownloadIcon data-icon="inline-start" />
                    {t("pages.recipeDetails.saveToMyRecipes")}
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    className="w-full"
                    onClick={() => void deleteRecipe()}
                  >
                    <Trash2Icon data-icon="inline-start" />
                    {t("pages.recipeDetails.delete")}
                  </Button>
                </div>
              </div>
            )}
            {!isOwner && isLoggedIn && (
              <div className="flex flex-col gap-4 p-4 print:hidden">
                <p className="text-sm text-muted-foreground">
                  {t("pages.recipeDetails.doesNotBelongToYou")}
                </p>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => void cloneRecipe()}
                >
                  <CloudDownloadIcon data-icon="inline-start" />
                  {t("pages.recipeDetails.saveToMyRecipes")}
                </Button>
              </div>
            )}
            {!isOwner && !isLoggedIn && (
              <div className="flex flex-col gap-4 p-4 print:hidden">
                <p className="text-sm text-muted-foreground">
                  {t("pages.recipeDetails.requiresAccountToSave")}
                </p>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => void authAndClone()}
                >
                  <CloudDownloadIcon data-icon="inline-start" />
                  {t("pages.recipeDetails.registerOrLoginToSave")}
                </Button>
              </div>
            )}
            <div className="border-b px-4 py-3 text-sm text-muted-foreground">
              <p>
                <i>
                  {t("pages.recipeDetails.created")}{" "}
                  {formatDate(recipe.createdAt, { times: true })}
                  <br />
                  {t("pages.recipeDetails.updated")}{" "}
                  {formatDate(recipe.updatedAt, { times: true })}
                  {recipe.lastMadeAt && (
                    <>
                      <br />
                      {t("pages.recipeDetails.lastMadeAt")}{" "}
                      {formatDate(recipe.lastMadeAt, { times: false })}
                    </>
                  )}
                </i>
              </p>
            </div>
            <br />
            {isOwner && recipe.folder === "main" && (
              <>
                <div className="flex flex-wrap justify-around gap-1 print:hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 text-primary"
                    render={
                      <Link to="/edit-recipe/$recipeId" params={{ recipeId }} />
                    }
                    nativeButton={false}
                  >
                    <PencilIcon data-icon="inline-start" />
                    {t("pages.recipeDetails.edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 text-primary"
                    onClick={() => void deleteRecipe()}
                  >
                    <Trash2Icon data-icon="inline-start" />
                    {t("pages.recipeDetails.delete")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 text-primary"
                    onClick={addRecipeToShoppingList}
                  >
                    <ListIcon data-icon="inline-start" />
                    {t("pages.recipeDetails.addToShoppingList")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 text-primary"
                    onClick={addRecipeToMealPlan}
                  >
                    <CalendarIcon data-icon="inline-start" />
                    {t("pages.recipeDetails.addToMealPlan")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 text-primary"
                    onClick={shareRecipe}
                  >
                    <ShareIcon data-icon="inline-start" />
                    {t("pages.recipeDetails.share")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 text-primary"
                    onClick={printRecipe}
                  >
                    <PrinterIcon data-icon="inline-start" />
                    {t("pages.recipeDetails.print")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 text-primary"
                    onClick={() => void cloneRecipe()}
                  >
                    <CopyIcon data-icon="inline-start" />
                    {t("pages.recipeDetails.makeACopy")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 text-primary"
                    onClick={isPinned ? unpinRecipe : pinRecipe}
                  >
                    <PinIcon data-icon="inline-start" />
                    {isPinned
                      ? t("pages.recipeDetails.unPinRecipe")
                      : t("pages.recipeDetails.pinRecipe")}
                  </Button>
                </div>
                <br />
              </>
            )}
          </div>
        )}
      </PageContent>
    </>
  );
};

export const RecipePage = () => {
  const { recipeId } = routeApi.useParams();

  return <RecipeDetails key={recipeId} recipeId={recipeId} />;
};
