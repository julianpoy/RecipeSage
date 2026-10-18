import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  BookmarkIcon,
  BookOpenIcon,
  FileTextIcon,
  LinkIcon,
  ListIcon,
  TagIcon,
} from "lucide-react";
import {
  applyDecimalNotation,
  RecipeDetailsPreferenceKey,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CachedImage } from "../../../components/CachedImage";
import { CopyWithWebshare } from "../../../components/copy-with-webshare/CopyWithWebshare";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import { openDialog } from "../../../components/dialogs/openDialog";
import { showAlert } from "../../../components/dialogs/showAlert";
import { showToast } from "../../../components/dialogs/showToast";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Rating } from "../../../components/rating/Rating";
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
import type { RouterOutputs } from "../../../services/server-actions/ActionsBase";
import { wakeLockService } from "../../../services/wakeLockService";
import { cookingToolbarStore } from "../../../stores/cookingToolbarStore";
import { preferencesStore } from "../../../stores/preferencesStore";
import { formatDate } from "../../../utils/formatDate";
import { getShareLinkOrigin } from "../../../utils/serverConfig";
import { session } from "../../../utils/session";
import { AuthView } from "../../auth/AuthView";
import { parseRecipeContent } from "../../recipe-components/parseRecipeContent";
import {
  RecipeNutrition,
  recipeHasNutrition,
} from "../../recipe-components/recipe/RecipeNutrition";
import { RecipeSectionTitle } from "../../recipe-components/recipe/RecipeSectionTitle";
import { recipeContentClassName } from "../../recipe-components/recipeContentClassName";
import { useLabeledPageTitle } from "../../recipe-components/useLabeledPageTitle";
import {
  DiscoverRecipePopover,
  type DiscoverRecipePopoverAction,
} from "../discover-recipe-popover/DiscoverRecipePopover";
import { discoverCategoryI18nKeys } from "../discoverCategoryI18nKeys";

type DiscoverRecipeDetail = RouterOutputs["discover"]["getDiscoverRecipe"];

const routeApi = getRouteApi("/discover/$discoverRecipeId");

const UNIT_SYSTEM_I18N_KEYS: Record<UnitSystem, TranslationKey> = {
  original: "components.scaleRecipe.system.original",
  metric: "components.scaleRecipe.system.metric",
  imperial: "components.scaleRecipe.system.imperial",
};

const CONTENT_CLASS_NAME = cn(
  "px-4 py-2 text-sm break-words text-foreground/80",
  recipeContentClassName,
);

const openAuthModal = (startWithRegister: boolean) =>
  openDialog<void>((controls) => (
    <ModalDialog controls={controls}>
      <AuthView
        startWithRegister={startWithRegister}
        modal={{ close: () => controls.close() }}
      />
    </ModalDialog>
  ));

const openShareDialog = (recipe: DiscoverRecipeDetail, title: string) => {
  const url = `${getShareLinkOrigin()}/app/discover/${recipe.id}`;

  return openDialog<void>((controls) => (
    <Dialog
      open={controls.open}
      onOpenChange={(open) => {
        if (!open) controls.close();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) controls.remove();
      }}
    >
      <DialogContent className="gap-0 p-2 sm:max-w-md">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <CopyWithWebshare
          copyText={url}
          webshareURL={url}
          webshareTitle={recipe.title}
          webshareText={recipe.title}
        />
      </DialogContent>
    </Dialog>
  ));
};

const MetaItem = ({ children }: { children: ReactNode }) => (
  <div className="p-1.5 text-sm">{children}</div>
);

const DiscoverRecipeDetails = ({
  discoverRecipeId,
}: {
  discoverRecipeId: string;
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isLoggedIn = useIsLoggedIn();

  const [scale, setScale] = useState(
    () =>
      recipeCompletionTrackerService.getRecipeScale(discoverRecipeId) || "1",
  );
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("original");
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [, bumpCompletion] = useReducer((count: number) => count + 1, 0);

  const meQuery = useOfflineFirstQuery(
    serverActions.users.getMe({ 401: () => {} }),
  );
  const me = meQuery.data;

  const recipeQueryKey = [
    "discover.getDiscoverRecipe",
    { id: discoverRecipeId },
  ];
  const recipeQuery = useActionQuery(recipeQueryKey, () =>
    serverActions.discover.getDiscoverRecipe(
      { id: discoverRecipeId },
      {
        404: () => {
          setNotFound(true);
        },
      },
    ),
  );
  const recipe = recipeQuery.data;

  const isFetching = recipeQuery.isFetching;
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

  useLabeledPageTitle(recipe?.title);

  const parsed = useMemo(
    () =>
      recipe
        ? parseRecipeContent(
            {
              ingredients: recipe.ingredients,
              instructions: recipe.instructions,
              notes: recipe.notes,
              images: recipe.discoverRecipeImages.map(
                (discoverRecipeImage) => ({
                  location: discoverRecipeImage.image.location,
                  order: discoverRecipeImage.order,
                }),
              ),
            },
            scale,
            unitSystem,
            i18n.language,
          )
        : undefined,
    [recipe, scale, unitSystem, i18n.language],
  );

  const isAuthor = !!recipe && me?.id === recipe.author.id;
  const decimalNotationMode = parsed?.decimalNotationMode ?? ".";
  const scaleDisplay = applyDecimalNotation(scale, decimalNotationMode);

  const updateRecipeData = (
    update: (prev: DiscoverRecipeDetail) => DiscoverRecipeDetail,
  ) => {
    queryClient.setQueryData<DiscoverRecipeDetail | null>(
      recipeQueryKey,
      (prev) => (prev ? update(prev) : prev),
    );
  };

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
      recipeCompletionTrackerService.setRecipeScale(
        discoverRecipeId,
        data.scale,
      );
    }
    if (data.unitSystem) {
      setUnitSystem(data.unitSystem);
    }
  };

  const toggleIngredientComplete = (idx: number) => {
    recipeCompletionTrackerService.toggleIngredientComplete(
      discoverRecipeId,
      idx,
    );
    bumpCompletion();
  };

  const toggleInstructionComplete = (idx: number) => {
    recipeCompletionTrackerService.toggleInstructionComplete(
      discoverRecipeId,
      idx,
    );
    bumpCompletion();
  };

  const pinRecipe = () => {
    if (!recipe) return;
    cookingToolbarStore.getState().pinRecipe({
      id: recipe.id,
      title: recipe.title,
      imageUrl: recipe.discoverRecipeImages[0]?.image.location || undefined,
      path: `/discover/${recipe.id}`,
    });
  };

  const unpinRecipe = () => {
    if (!recipe) return;
    cookingToolbarStore.getState().unpinRecipe(recipe.id);
  };

  const enterCookMode = async () => {
    if (!recipe) return;
    await fullscreenService.request();
    void navigate({
      to: "/discover/$discoverRecipeId/cook",
      params: { discoverRecipeId: recipe.id },
    });
  };

  const share = () => {
    if (!recipe) return;
    void openShareDialog(recipe, t("pages.recipeDetailsPopover.share"));
  };

  const submitReport = async (reason: string) => {
    if (!recipe) return;

    const response = await serverActions.discover.reportDiscoverRecipe({
      id: recipe.id,
      reason,
    });

    if (!response) return;

    showToast({
      message: t("pages.discoverRecipe.report.success"),
      duration: 5000,
    });
  };

  const report = async () => {
    if (!recipe) return;

    if (!session.isLoggedIn()) {
      await openAuthModal(false);
      await meQuery.refetch();
      if (!session.isLoggedIn()) return;
    }

    await showAlert({
      header: t("pages.discoverRecipe.report.confirm.header"),
      message: t("pages.discoverRecipe.report.confirm.message"),
      inputs: [
        {
          name: "reason",
          type: "textarea",
          placeholder: t("pages.discoverRecipe.report.reasonPlaceholder"),
          maxLength: 2000,
        },
      ],
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
        },
        {
          text: t("pages.discoverRecipe.report"),
          variant: "destructive",
          handler: (values) => {
            const reason = (values.reason || "").trim();
            if (reason.length < 5) {
              showToast({
                message: t("pages.discoverRecipe.report.reasonTooShort"),
                duration: 5000,
              });
              return false;
            }
            void submitReport(reason);
            return true;
          },
        },
      ],
    });
  };

  const rate = async (rating: number) => {
    if (!recipe) return;

    const response = await serverActions.discover.rateDiscoverRecipe({
      id: recipe.id,
      rating,
    });

    if (!response) return;

    updateRecipeData((prev) => ({
      ...prev,
      myRating: response.myRating,
      ratingAverage: response.ratingAverage,
      ratingCount: response.ratingCount,
    }));
  };

  const performSave = async (title: string) => {
    if (!recipe) return;

    const loading = loadingService.start();

    const response = await serverActions.discover.saveDiscoverRecipe({
      id: recipe.id,
      title,
    });

    loading.dismiss();
    if (!response) return;

    showToast({
      message: t("pages.discoverRecipe.saveSuccess"),
      duration: 5000,
      action: {
        text: t("generic.close"),
        handler: () => {},
      },
    });

    void navigate({
      to: "/recipe/$recipeId",
      params: { recipeId: response.recipeId },
    });
  };

  const save = async () => {
    if (savingRef.current) return;
    if (!recipe) return;

    savingRef.current = true;
    setSaving(true);
    try {
      const title = recipe.title;

      const loading = loadingService.start();
      const conflictingRecipes = await serverActions.recipes.getRecipesByTitle({
        title,
      });
      const uniqueTitle = await serverActions.recipes.getUniqueRecipeTitle({
        title,
      });
      loading.dismiss();

      if (!conflictingRecipes || !uniqueTitle) return;

      if (!conflictingRecipes.length) {
        await performSave(title);
        return;
      }

      const { role } = await showAlert({
        header: t("pages.editRecipe.conflict.title"),
        message: t("pages.editRecipe.conflict.message", {
          title,
          uniqueTitle,
        }),
        buttons: [
          {
            text: t("generic.cancel"),
            role: "cancel",
          },
          {
            text: t("pages.editRecipe.conflict.rename"),
            role: "rename",
          },
          {
            text: t("pages.editRecipe.conflict.ignore"),
            role: "ignore",
          },
        ],
      });

      if (role === "rename") await performSave(uniqueTitle);
      if (role === "ignore") await performSave(title);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const authAndSave = async () => {
    if (savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    try {
      await openAuthModal(true);
      await meQuery.refetch();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    if (session.isLoggedIn()) {
      await save();
    }
  };

  const edit = () => {
    if (!recipe) return;
    void navigate({
      to: "/discover/$discoverRecipeId/edit",
      params: { discoverRecipeId: recipe.id },
    });
  };

  const performUnpublish = async () => {
    if (!recipe) return;

    const loading = loadingService.start();

    const response = await serverActions.discover.unpublishDiscoverRecipe({
      id: recipe.id,
    });

    loading.dismiss();
    if (!response) return;

    void navigate({ to: "/discover", replace: true });
  };

  const unpublish = async () => {
    if (!recipe) return;

    await showAlert({
      header: t("pages.discoverRecipe.unpublish.confirm.header"),
      message: t("pages.discoverRecipe.unpublish.confirm.message"),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
        },
        {
          text: t("pages.discoverRecipe.unpublish"),
          variant: "destructive",
          handler: () => {
            void performUnpublish();
          },
        },
      ],
    });
  };

  const onPopoverAction = (action: DiscoverRecipePopoverAction) => {
    switch (action) {
      case "edit":
        return edit();
      case "unpublish":
        return void unpublish();
      case "pin":
        return pinRecipe();
      case "unpin":
        return unpinRecipe();
      case "enterCookMode":
        return void enterCookMode();
      case "share":
        return share();
      case "report":
        return void report();
      case "updateWakeLock":
        return;
      default: {
        const exhaustiveCheck: never = action;
        throw new Error(`Unhandled action case: ${exhaustiveCheck}`);
      }
    }
  };

  const openRecipeImageViewer = () => {
    if (!recipe || !recipe.discoverRecipeImages.length) return;

    void openImageViewer({
      imageUrls: recipe.discoverRecipeImages.map(
        (discoverRecipeImage) => discoverRecipeImage.image.location,
      ),
    });
  };

  const firstImage = recipe?.discoverRecipeImages[0];
  const ingredients = parsed?.ingredients;
  const instructions = parsed?.instructions;
  const notes = parsed?.notes;

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/discover" }} />}
        title={t("pages.discoverRecipe.pageTitle")}
        end={
          recipe && (
            <DiscoverRecipePopover
              recipeId={recipe.id}
              isAuthor={isAuthor}
              onAction={onPopoverAction}
            />
          )
        }
      />
      <PageContent>
        {notFound && (
          <div className="px-4 py-12 text-center text-foreground">
            <p>{t("pages.discoverRecipe.notFound")}</p>
          </div>
        )}

        {recipe && (
          <div className="mx-auto max-w-[1250px] pb-[25vh]">
            <div className="flex items-start gap-4 px-4 py-2">
              {firstImage && (
                <button
                  type="button"
                  className="mt-4 size-14 shrink-0 cursor-pointer overflow-hidden rounded-sm shadow-[1px_1px_5px_rgba(0,0,0,0.35)] focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
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
                <div className="my-4 flex flex-wrap items-center justify-start border-y">
                  <MetaItem>
                    <p className="break-words">
                      <b>{t("pages.discoverRecipe.author")} </b>
                      {recipe.author.handle ? (
                        <Link
                          to="/people/$handle"
                          params={{ handle: `@${recipe.author.handle}` }}
                          dir="auto"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          @{recipe.author.handle}
                        </Link>
                      ) : (
                        <span dir="auto">{recipe.author.name}</span>
                      )}
                    </p>
                  </MetaItem>
                  <MetaItem>
                    <p className="flex items-center gap-2">
                      {!!recipe.ratingCount && (
                        <>
                          <Rating
                            rating={recipe.ratingAverage}
                            className="text-lg"
                          />
                          <span>
                            {t("pages.discoverRecipe.ratingCount", {
                              count: recipe.ratingCount,
                            })}
                          </span>
                        </>
                      )}
                      <span>
                        {t("pages.discover.recipe.saves", {
                          count: recipe.saveCount,
                        })}
                      </span>
                    </p>
                  </MetaItem>
                  {recipe.activeTime && (
                    <MetaItem>
                      <p className="break-words">
                        <b>{t("pages.recipeDetails.activeTime")}: </b>
                        <span dir="auto">{recipe.activeTime}</span>
                      </p>
                    </MetaItem>
                  )}
                  {recipe.totalTime && (
                    <MetaItem>
                      <p className="break-words">
                        <b>{t("pages.recipeDetails.totalTime")}: </b>
                        <span dir="auto">{recipe.totalTime}</span>
                      </p>
                    </MetaItem>
                  )}
                  {recipe.yield && (
                    <MetaItem>
                      <p className="break-words">
                        <b>{t("pages.recipeDetails.yield")}: </b>
                        <span dir="auto">{recipe.yield}</span>
                      </p>
                    </MetaItem>
                  )}
                </div>
                <p
                  dir="auto"
                  className="text-sm break-words whitespace-pre-line text-foreground/80"
                >
                  {recipe.description}
                </p>
              </div>
            </div>

            <br />

            {isLoggedIn && !isAuthor && (
              <div className="mt-2 mb-1 flex items-center gap-2.5 px-4 print:hidden">
                <span className="text-sm font-bold">
                  {t("pages.discoverRecipe.rateThis")}
                </span>
                <Rating
                  rating={recipe.myRating}
                  enableEdit
                  className="text-[26px]"
                  onRatingChange={(rating) => void rate(rating)}
                />
              </div>
            )}

            {!isAuthor && (
              <div className="my-2 px-4 print:hidden">
                <Button
                  size="lg"
                  disabled={saving}
                  onClick={() => void (isLoggedIn ? save() : authAndSave())}
                >
                  <BookmarkIcon data-icon="inline-start" />
                  {t("pages.discoverRecipe.save")}
                </Button>
              </div>
            )}

            <br />
            <div className="flex flex-wrap sm:flex-nowrap">
              <div className="w-full max-w-full shrink-0 sm:w-[215px] min-[1000px]:w-[275px] min-[1200px]:w-[325px]">
                <RecipeSectionTitle icon={<BookOpenIcon />}>
                  <b>{t("pages.recipeDetails.ingredients")}</b>
                </RecipeSectionTitle>
                <div dir="auto" className={CONTENT_CLASS_NAME}>
                  {ingredients?.map((ingredient, idx) => (
                    <p
                      key={idx}
                      dir="auto"
                      className={cn(
                        "mb-0.5",
                        ingredient.isHeader &&
                          "mt-2 mb-1 block font-bold first:mt-0",
                        !ingredient.isHeader && "cursor-pointer",
                        recipeCompletionTrackerService.getIngredientComplete(
                          discoverRecipeId,
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
                </div>
              </div>
              <div className="min-w-full grow sm:min-w-0">
                <RecipeSectionTitle icon={<ListIcon />}>
                  <b>{t("pages.recipeDetails.instructions")}</b>
                </RecipeSectionTitle>
                <div dir="auto" className={CONTENT_CLASS_NAME}>
                  {instructions?.map((instruction, idx) => (
                    <p
                      key={idx}
                      dir="auto"
                      className="group/instruction mb-4 max-w-[900px]"
                    >
                      {instruction.isHeader ? (
                        <span
                          dir="auto"
                          className="block pt-2 pb-1 font-bold group-first/instruction:pt-0"
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
                                discoverRecipeId,
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
                </div>
              </div>
            </div>

            {notes && (
              <div className="mt-4">
                <RecipeSectionTitle icon={<FileTextIcon />}>
                  <b>{t("pages.recipeDetails.notes")}</b>
                </RecipeSectionTitle>
                <div dir="auto" className={CONTENT_CLASS_NAME}>
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
                </div>
              </div>
            )}

            {recipeHasNutrition(recipe) && <RecipeNutrition recipe={recipe} />}

            {recipe.categories.length > 0 && (
              <>
                <br />
                <RecipeSectionTitle icon={<TagIcon />}>
                  <b>{t("pages.discoverRecipe.categories")}</b>
                </RecipeSectionTitle>
                <div className="ms-4 flex flex-wrap ps-4">
                  {recipe.categories.map((category) => {
                    const labelKey = discoverCategoryI18nKeys[category];
                    return (
                      <Link
                        key={category}
                        to="/discover"
                        search={{ categories: category }}
                        className="m-1 inline-flex min-h-8 items-center rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
                      >
                        {labelKey ? t(labelKey) : category}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}

            {recipe.linkedRecipes.length > 0 && (
              <>
                <br />
                <div className="my-4">
                  <RecipeSectionTitle icon={<LinkIcon />}>
                    <b>{t("pages.discoverRecipe.linkedRecipes")}</b>
                  </RecipeSectionTitle>
                  <ul>
                    {recipe.linkedRecipes.map((linkedRecipe) => {
                      const linkedImage = linkedRecipe.discoverRecipeImages[0];
                      return (
                        <li key={linkedRecipe.id}>
                          <Link
                            to="/discover/$discoverRecipeId"
                            params={{ discoverRecipeId: linkedRecipe.id }}
                            className="flex min-h-12 items-center gap-4 rounded-xl px-4 py-1.5 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                          >
                            {linkedImage ? (
                              <CachedImage
                                src={linkedImage.image.location}
                                className="size-10 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <img
                                src="assets/imgs/logo_green_padded.png"
                                alt=""
                                className="size-10 shrink-0 rounded-full object-cover"
                              />
                            )}
                            <span
                              dir="auto"
                              className="min-w-0 flex-1 truncate"
                            >
                              {linkedRecipe.title}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}

            {recipe.modifiedAt && (
              <p className="mt-4 px-4 text-[0.8125rem] text-foreground italic">
                {t("pages.discoverRecipe.modified", {
                  date: formatDate(recipe.modifiedAt, { times: false }),
                })}
              </p>
            )}
          </div>
        )}
      </PageContent>
    </>
  );
};

export const DiscoverRecipePage = () => {
  const { discoverRecipeId } = routeApi.useParams();

  return (
    <DiscoverRecipeDetails
      key={discoverRecipeId}
      discoverRecipeId={discoverRecipeId}
    />
  );
};
