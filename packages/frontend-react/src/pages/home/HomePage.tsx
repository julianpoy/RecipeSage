import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { getRouteApi, Link, useRouterState } from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useTranslation } from "react-i18next";
import {
  DownloadIcon,
  FunnelIcon,
  MailOpenIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import type { RecipeSummaryLite, UserPublic } from "@recipesage/prisma";
import {
  MyRecipesPreferenceKey,
  MyRecipesViewTypeOptions,
  SEARCH_TERM_LENGTH_LIMIT,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { showAlert } from "../../components/dialogs/showAlert";
import { BackButton } from "../../components/layout/BackButton";
import { Fab } from "../../components/layout/Fab";
import { PageContent } from "../../components/layout/PageContent";
import { PageHeader } from "../../components/layout/PageHeader";
import { LogoIcon } from "../../components/LogoIcon";
import { NullState } from "../../components/NullState";
import { RecipeListItem } from "../../components/recipe-list-item/RecipeListItem";
import { useActionQuery } from "../../hooks/useActionQuery";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useNavigateOrOpenWindow } from "../../hooks/useNavigateOrOpenWindow";
import { useOfflineFirstQuery } from "../../hooks/useOfflineFirstQuery";
import { loadingService } from "../../services/loadingService";
import { serverActions } from "../../services/serverActions";
import { cookingToolbarStore } from "../../stores/cookingToolbarStore";
import { preferencesStore } from "../../stores/preferencesStore";
import {
  HomePopover,
  type HomePopoverResult,
} from "../home-popover/HomePopover";
import {
  HomeSearchFilterPopover,
  type HomeSearchFilterResult,
} from "../home-search-popover/HomeSearchFilterPopover";
import { homeListStore, type HomeRouteParams } from "./homeListStore";
import {
  RecipeTile,
  recipeTileClassName,
  type RecipeTileDisplayOptions,
} from "./RecipeTile";

const routeApi = getRouteApi("/list/$folder");

const TILE_WIDTH = 200;
const TILE_PADD = 20;
const MOBILE_TWO_COLUMN_MIN_WIDTH = 375;
const NARROW_TILE_MAX_WIDTH = 439;
const RECIPE_FETCH_BUFFER = 100;

const COMPACT_ROW_HEIGHT = 42;
const LIST_ROW_HEIGHT = 96;
const LIST_ROW_HEIGHT_SM = 216;

const headerButtonClassName =
  "text-inherit hover:bg-white/10 hover:text-inherit";

const getTileColCount = (homePageWidth: number) => {
  const minimumColumnCount =
    homePageWidth >= MOBILE_TWO_COLUMN_MIN_WIDTH ? 2 : 1;
  return Math.max(
    Math.floor(homePageWidth / (TILE_WIDTH + TILE_PADD)),
    minimumColumnCount,
  );
};

const getRootFontSize = () =>
  parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

const getTileRowHeight = (options: RecipeTileDisplayOptions) => {
  const viewportWidth = window.innerWidth;
  const tileWidth =
    viewportWidth >= MOBILE_TWO_COLUMN_MIN_WIDTH &&
    viewportWidth <= NARROW_TILE_MAX_WIDTH
      ? Math.min(TILE_WIDTH, (viewportWidth - 32) / 2)
      : TILE_WIDTH;
  const rem = getRootFontSize();
  const paragraphCount = [
    options.showDescription,
    options.showSource,
    options.showFromUser,
    options.showLabels,
    options.showRating,
  ].filter((enabled) => enabled).length;
  const imageSize = options.showImage ? tileWidth : 1.25 * rem;
  const contentHeight = (1.375 + 2.25 + paragraphCount * 1.188) * rem;
  return imageSize + contentHeight + TILE_PADD;
};

const parseRouteParams = (
  folder: string,
  userId: string | undefined,
  labels: string | undefined,
): HomeRouteParams => ({
  folder: folder === "inbox" ? "inbox" : "main",
  userId,
  selectedLabels: (labels || "").split(",").filter((e) => e),
});

export const HomePage = () => {
  const { t } = useTranslation();
  const navigate = routeApi.useNavigate();
  const navigateOrOpenWindow = useNavigateOrOpenWindow();
  const { folder: folderParam } = routeApi.useParams();
  const { labels: labelsParam, userId: userIdParam } = routeApi.useSearch();
  const historyShowBack = useRouterState({
    select: (state) => !!state.location.state.showBack,
  });
  const locationKey = useRouterState({
    select: (state) =>
      state.location.pathname.startsWith("/list/")
        ? state.location.state.__TSR_key
        : undefined,
  });

  const routeParams = useMemo(
    () => parseRouteParams(folderParam, userIdParam, labelsParam),
    [folderParam, userIdParam, labelsParam],
  );

  useState(() => {
    homeListStore.getState().enter(routeParams, locationKey);
    return true;
  });

  const folder = homeListStore((state) => state.folder);
  const userId = homeListStore((state) => state.userId);
  const selectedLabels = homeListStore((state) => state.selectedLabels);
  const labels = homeListStore((state) => state.labels);
  const recipes = homeListStore((state) => state.recipes);
  const totalRecipeCount = homeListStore((state) => state.totalRecipeCount);
  const recipesGeneration = homeListStore((state) => state.recipesGeneration);
  const loading = homeListStore((state) => state.loading);
  const searchText = homeListStore((state) => state.searchText);
  const ratingFilter = homeListStore((state) => state.ratingFilter);
  const nutritionFilter = homeListStore((state) => state.nutritionFilter);
  const hasActiveNutritionFilter = homeListStore((state) =>
    state.hasActiveNutritionFilter(),
  );

  const preferences = preferencesStore((state) => state.preferences);

  const hasRecipes = recipes.length > 0;
  const shouldShowLabelChips =
    labels.length > 0 &&
    !userId &&
    preferences[MyRecipesPreferenceKey.ShowLabelChips] &&
    folder === "main";

  const [searchInput, setSearchInput] = useState(
    () => homeListStore.getState().searchText,
  );
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const routeParamsVersion = homeListStore((state) => state.routeParamsVersion);
  const [selectionParamsVersion, setSelectionParamsVersion] =
    useState(routeParamsVersion);
  if (selectionParamsVersion !== routeParamsVersion) {
    setSelectionParamsVersion(routeParamsVersion);
    setSelectionMode(false);
    setSelectedRecipeIds([]);
  }

  const myProfile = useOfflineFirstQuery(
    serverActions.users.getMe({
      401: () => {},
    }),
  ).data;

  const friendsQuery = useActionQuery(["users.getMyFriends"], () =>
    serverActions.users.getMyFriends({
      401: () => {},
    }),
  );
  const friendsById = useMemo(() => {
    if (!friendsQuery.data) return undefined;
    return friendsQuery.data.friends.reduce<Record<string, UserPublic>>(
      (acc, friendEntry) => {
        acc[friendEntry.id] = friendEntry;
        return acc;
      },
      {},
    );
  }, [friendsQuery.data]);

  const otherUserProfileQuery = useActionQuery(
    ["users.getUserProfilesById", { ids: [userId] }],
    () =>
      userId
        ? serverActions.users.getUserProfilesById({
            ids: [userId],
          })
        : Promise.resolve(undefined),
    { enabled: !!userId },
  );
  const otherUserProfile = userId
    ? otherUserProfileQuery.data?.at(0)
    : undefined;

  const clearSelectedRecipes = () => {
    setSelectionMode(false);
    setSelectedRecipeIds([]);
  };

  const resetAndLoadAllWithProgressIndicator = (
    scrollToLastPosition?: boolean,
  ) => {
    const loadingRef = loadingService.start();
    void homeListStore
      .getState()
      .resetAndLoadAll(scrollToLastPosition)
      .finally(() => {
        loadingRef.dismiss();
      });
  };

  const onEnter = useEffectEvent(() => {
    homeListStore.setState({ mounted: true });
    if (homeListStore.getState().reloadPending) {
      resetAndLoadAllWithProgressIndicator(true);
    }
  });

  useEffect(() => {
    onEnter();
    return () => {
      homeListStore.getState().leave();
    };
  }, []);

  const onRouteParamsChange = useEffectEvent((params: HomeRouteParams) => {
    if (!homeListStore.getState().applyRouteParams(params)) return;
    resetAndLoadAllWithProgressIndicator();
  });

  useEffect(() => {
    onRouteParamsChange(routeParams);
  }, [routeParams]);

  useEffect(() => {
    homeListStore.getState().setHistoryKey(locationKey);
  }, [locationKey]);

  const syncFiltersToUrl = useEffectEvent(() => {
    const state = homeListStore.getState();
    if (!state.mounted) return;
    const joinedLabels = state.selectedLabels.join(",");
    if (joinedLabels === (labelsParam || "")) return;
    void navigate({
      search: (prev) => ({
        ...prev,
        labels: joinedLabels || undefined,
      }),
      replace: true,
      state: true,
    });
  });

  useEffect(() => {
    syncFiltersToUrl();
  }, [selectedLabels]);

  const viewType = preferences[MyRecipesPreferenceKey.ViewType];
  const isTiles = viewType === MyRecipesViewTypeOptions.Tiles;
  const isListView =
    viewType === MyRecipesViewTypeOptions.List ||
    viewType === MyRecipesViewTypeOptions.Compact;
  const isSmallUp = useMediaQuery("(min-width: 640px)");

  const contentRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(() => window.innerWidth);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);

  useLayoutEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;

    let resizeFrame: number | null = null;
    const measure = () => {
      setContentWidth(contentEl.clientWidth);
      setViewportWidth(window.innerWidth);
      const listEl = listRef.current;
      if (listEl) {
        setScrollMargin(listEl.getBoundingClientRect().top + window.scrollY);
      }
    };
    const scheduleMeasure = () => {
      if (resizeFrame !== null) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        measure();
      });
    };

    measure();
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(contentEl);
    window.addEventListener("resize", scheduleMeasure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    };
  }, []);

  useLayoutEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const margin = listEl.getBoundingClientRect().top + window.scrollY;
    if (margin !== scrollMargin) setScrollMargin(margin);
  }, [scrollMargin, shouldShowLabelChips, labels, hasRecipes, isTiles]);

  const tileColCount = getTileColCount(contentWidth);

  const tileDisplayOptions: RecipeTileDisplayOptions = {
    showImage: preferences[MyRecipesPreferenceKey.ShowImages],
    showDescription: preferences[MyRecipesPreferenceKey.ShowRecipeDescription],
    showSource: preferences[MyRecipesPreferenceKey.ShowSource],
    showFromUser: folder === "inbox",
    showLabels: preferences[MyRecipesPreferenceKey.ShowLabels],
    showRating: preferences[MyRecipesPreferenceKey.ShowRating],
    singleColumn: tileColCount === 1,
  };

  let rowHeight = LIST_ROW_HEIGHT;
  if (isTiles) {
    rowHeight = getTileRowHeight(tileDisplayOptions);
  } else if (viewType === MyRecipesViewTypeOptions.Compact) {
    rowHeight = COMPACT_ROW_HEIGHT;
  } else if (isSmallUp) {
    rowHeight = LIST_ROW_HEIGHT_SM;
  }

  const itemCount = searchText
    ? recipes.length
    : (totalRecipeCount ?? recipes.length);
  const rowCount = isTiles ? Math.ceil(itemCount / tileColCount) : itemCount;
  const columnCount = isTiles ? tileColCount : 1;

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => rowHeight,
    overscan: 5,
    scrollMargin,
    getItemKey: (index) => {
      if (isTiles) return `tiles-${tileColCount}-${index}`;
      return recipes[index]?.id ?? `placeholder-${index}`;
    },
  });

  useEffect(() => {
    virtualizer.measure();
  }, [virtualizer, rowHeight, columnCount, viewportWidth]);

  const virtualItems = virtualizer.getVirtualItems();
  const lastVirtualIndex = virtualItems.at(-1)?.index ?? 0;
  const fetchTarget = (lastVirtualIndex + 1) * columnCount;

  useEffect(() => {
    const store = homeListStore.getState();
    void store.fetchMoreRecipes(fetchTarget);
    void store.fetchMoreRecipes(fetchTarget + RECIPE_FETCH_BUFFER);
  }, [fetchTarget, totalRecipeCount, recipesGeneration]);

  const search = (text: string) => {
    void homeListStore.getState().search(text);
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    search(event.currentTarget.value);
    event.currentTarget.blur();
  };

  const clearSearch = () => {
    setSearchInput("");
    search("");
  };

  const selectRecipe = (recipe: RecipeSummaryLite) => {
    setSelectedRecipeIds((prev) =>
      prev.includes(recipe.id)
        ? prev.filter((id) => id !== recipe.id)
        : [...prev, recipe.id],
    );
  };

  const onListItemClick = (
    recipe: RecipeSummaryLite,
    event: MouseEvent | KeyboardEvent,
  ) => {
    if (selectionMode) {
      selectRecipe(recipe);
      return;
    }
    navigateOrOpenWindow(`/recipe/${recipe.id}`, event);
  };

  const onTileClick = (
    recipe: RecipeSummaryLite,
    event: MouseEvent<HTMLAnchorElement>,
  ) => {
    if (!selectionMode) return;
    event.preventDefault();
    selectRecipe(recipe);
  };

  const isFromAnotherUser = (recipe: RecipeSummaryLite) => {
    if (!myProfile) return false;
    return !userId && myProfile.id !== recipe.userId;
  };

  const getRecipeBadgeHandle = (recipe: RecipeSummaryLite) => {
    if (!isFromAnotherUser(recipe)) return undefined;
    return friendsById?.[recipe.userId]?.handle ?? undefined;
  };

  const isFromSharedCollection = (recipe: RecipeSummaryLite) => {
    if (!isFromAnotherUser(recipe)) return false;
    return !friendsById?.[recipe.userId]?.handle;
  };

  const blockedBySelectedRecipesFromOtherUsers = async () => {
    if (!myProfile) return false;

    const fromOtherUsers = recipes.filter(
      (recipe): recipe is RecipeSummaryLite =>
        !!recipe &&
        selectedRecipeIds.includes(recipe.id) &&
        recipe.userId !== myProfile.id,
    );
    if (!fromOtherUsers.length) return false;

    const recipeNames = fromOtherUsers.map((recipe) => recipe.title).join(", ");

    void showAlert({
      header: t("pages.home.selectionNotOwned.header"),
      message: t("pages.home.selectionNotOwned.message", { recipeNames }),
      buttons: [{ text: t("generic.okay") }],
    });

    return true;
  };

  const addLabelToSelectedRecipes = async () => {
    if (!selectedRecipeIds.length) return;
    if (await blockedBySelectedRecipesFromOtherUsers()) return;

    await showAlert({
      header: t("pages.home.addLabel.header"),
      message: t("pages.home.addLabel.message"),
      inputs: [
        {
          name: "labelName",
          placeholder: t("pages.home.addLabel.placeholder"),
        },
      ],
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
        },
        {
          text: t("generic.save"),
          handler: async ({ labelName }) => {
            if (!selectedRecipeIds.length) return;

            const loadingRef = loadingService.start();
            const response = await serverActions.labels.upsertLabel({
              title: (labelName || "").toLowerCase(),
              addToRecipeIds: selectedRecipeIds,
            });
            if (!response) {
              loadingRef.dismiss();
              return;
            }
            await homeListStore.getState().resetAndLoadAll();
            loadingRef.dismiss();
          },
        },
      ],
    });
  };

  const startExport = async (
    recipeIds: string[],
    format: "txt" | "pdf" | "jsonld",
  ) => {
    if (!recipeIds.length) return;

    const result = await serverActions.jobs.startExportJob({
      format,
      recipeIds,
    });

    if (!result) return;

    await showAlert({
      header: t("pages.home.exportSelected.processing.header"),
      message: t("pages.home.exportSelected.processing.message"),
      buttons: [
        {
          text: t("generic.close"),
          role: "cancel",
        },
        {
          text: t("pages.home.exportSelected.processing.view"),
          handler: () => {
            void navigate({ to: "/settings/export" });
          },
        },
      ],
    });
  };

  const exportSelectedRecipes = async () => {
    if (!selectedRecipeIds.length) return;

    await showAlert({
      header: t("pages.home.exportSelected.header"),
      message: t("pages.home.exportSelected.message"),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
          handler: () => {},
        },
        {
          text: t("pages.home.exportSelected.pdf"),
          variant: "default",
          handler: () => {
            void startExport(selectedRecipeIds, "pdf");
          },
        },
        {
          text: t("pages.home.exportSelected.text"),
          handler: () => {
            void startExport(selectedRecipeIds, "txt");
          },
        },
      ],
    });
  };

  const deleteSelectedRecipes = async () => {
    if (!selectedRecipeIds.length) return;
    if (await blockedBySelectedRecipesFromOtherUsers()) return;

    const recipeNames = selectedRecipeIds
      .map(
        (recipeId) => recipes.find((recipe) => recipe?.id === recipeId)?.title,
      )
      .filter((title): title is string => !!title)
      .join(", ");

    await showAlert({
      header: t("pages.home.deleteSelected.header"),
      message: t("pages.home.deleteSelected.message", { recipeNames }),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
          handler: () => {},
        },
        {
          text: t("generic.delete"),
          variant: "destructive",
          handler: async () => {
            if (!selectedRecipeIds.length) return;

            const loadingRef = loadingService.start();
            try {
              const response = await serverActions.recipes.deleteRecipesByIds({
                ids: selectedRecipeIds,
              });
              if (!response) return;
              for (const id of selectedRecipeIds) {
                cookingToolbarStore.getState().unpinRecipe(id);
              }
              clearSelectedRecipes();
              await homeListStore.getState().resetAndLoadAll();
            } finally {
              loadingRef.dismiss();
            }
          },
        },
      ],
    });
  };

  const onHomePopoverDismiss = (result: HomePopoverResult) => {
    if (typeof result.selectionMode === "boolean") {
      setSelectionMode(result.selectionMode);
      if (!result.selectionMode) {
        clearSelectedRecipes();
      }
    }
    if (result.refreshSearch) {
      void homeListStore.getState().resetAndLoadRecipes();
    }
  };

  const onSearchFilterDismiss = (result: HomeSearchFilterResult) => {
    const store = homeListStore.getState();
    store.applyFilters({
      selectedLabels: result.selectedLabels,
      ratingFilter: result.ratingFilter,
      nutritionFilter: result.nutritionFilter,
    });
    if (result.refreshSearch) void store.resetAndLoadAll();
  };

  const showBack = !!userId || historyShowBack;

  let headerStart;
  if (selectionMode) {
    headerStart = (
      <Button
        variant="ghost"
        size="icon-lg"
        className={headerButtonClassName}
        aria-label={t("pages.homepopover.options.unselectAllRecipes")}
        onClick={clearSelectedRecipes}
      >
        <XIcon className="size-6" />
      </Button>
    );
  } else if (showBack) {
    headerStart = (
      <BackButton
        fallback={
          otherUserProfile?.handle
            ? {
                to: "/people/$handle",
                params: { handle: `@${otherUserProfile.handle}` },
              }
            : { to: "/people" }
        }
      />
    );
  }

  let title = "";
  if (!userId && selectionMode) {
    title = t("pages.home.title.selectionMode", {
      count: selectedRecipeIds.length,
    });
  } else if (!userId && folder === "main") {
    title = t("pages.home.title.main");
  } else if (!userId && folder === "inbox") {
    title = t("pages.home.title.inbox");
  } else if (userId && otherUserProfile && selectedLabels.length) {
    title = t("pages.home.title.sharedLabel.withProfile", {
      name: otherUserProfile.name,
      label: selectedLabels[0],
    });
  } else if (userId && otherUserProfile) {
    title = t("pages.home.title.sharedAll.withProfile", {
      name: otherUserProfile.name,
    });
  } else if (userId && selectedLabels.length) {
    title = t("pages.home.title.sharedLabel", { label: selectedLabels[0] });
  } else if (userId) {
    title = t("pages.home.title.sharedAll");
  }

  const hasSelection = selectionMode && selectedRecipeIds.length > 0;

  const labelChips = shouldShowLabelChips && (
    <div className="flex flex-wrap px-1 pt-0.5 pb-2">
      {labels.map((label) => (
        <button
          key={label.id}
          type="button"
          dir="auto"
          aria-pressed={selectedLabels.includes(label.title)}
          className={cn(
            "mx-1 my-0.5 cursor-pointer rounded-[20px] border px-3 py-1.5 transition-shadow hover:bg-muted",
            selectedLabels.includes(label.title) &&
              "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
          )}
          onClick={() => homeListStore.getState().toggleLabel(label.title)}
        >
          {label.title} ({label._count.recipeLabels})
        </button>
      ))}
    </div>
  );

  const renderVirtualRow = (rowIndex: number) => {
    if (isTiles) {
      const tiles = [];
      for (let col = 0; col < tileColCount; col++) {
        const recipeIndex = rowIndex * tileColCount + col;
        if (recipeIndex >= itemCount) break;
        const recipe = recipes[recipeIndex];
        tiles.push(
          recipe ? (
            <RecipeTile
              key={recipe.id}
              recipe={recipe}
              displayOptions={tileDisplayOptions}
              selected={selectedRecipeIds.includes(recipe.id)}
              badgeHandle={getRecipeBadgeHandle(recipe)}
              fromSharedCollection={isFromSharedCollection(recipe)}
              onClick={(event) => onTileClick(recipe, event)}
            />
          ) : (
            <div
              key={`placeholder-${recipeIndex}`}
              aria-hidden="true"
              className={cn(
                recipeTileClassName(tileDisplayOptions),
                "animate-pulse",
              )}
            />
          ),
        );
      }
      return (
        <div className="flex justify-around p-2.5 [--tile-width:200px] min-[375px]:max-[439px]:[--tile-width:min(200px,calc((100vw-32px)/2))]">
          {tiles}
        </div>
      );
    }

    const recipe = recipes[rowIndex];
    if (!recipe) {
      return (
        <div
          aria-hidden="true"
          className="animate-pulse border-b bg-muted/40"
          style={{ height: rowHeight }}
        />
      );
    }

    return (
      <RecipeListItem
        recipe={recipe}
        viewType={
          viewType === MyRecipesViewTypeOptions.Compact ? "compact" : "list"
        }
        showImage={preferences[MyRecipesPreferenceKey.ShowImages]}
        showDescription={
          preferences[MyRecipesPreferenceKey.ShowRecipeDescription]
        }
        showSource={preferences[MyRecipesPreferenceKey.ShowSource]}
        showFromUser={recipe.folder === "inbox"}
        showLabels={preferences[MyRecipesPreferenceKey.ShowLabels]}
        showRating={preferences[MyRecipesPreferenceKey.ShowRating]}
        selected={selectedRecipeIds.includes(recipe.id)}
        badgeHandle={getRecipeBadgeHandle(recipe)}
        fromSharedCollection={isFromSharedCollection(recipe)}
        onRecipeClick={(event) => onListItemClick(recipe, event)}
      />
    );
  };

  const hasNoFilters =
    !selectedLabels.length && !ratingFilter.length && !hasActiveNutritionFilter;

  return (
    <>
      <PageHeader
        start={headerStart}
        title={title}
        end={
          <>
            {hasSelection && folder === "main" && (
              <Button
                variant="ghost"
                size="icon-lg"
                className={headerButtonClassName}
                aria-label={t("pages.home.addLabel.header")}
                onClick={() => void addLabelToSelectedRecipes()}
              >
                <TagIcon className="size-6" />
              </Button>
            )}
            {hasSelection && (
              <Button
                variant="ghost"
                size="icon-lg"
                className={headerButtonClassName}
                aria-label={t("pages.export.title")}
                onClick={() => void exportSelectedRecipes()}
              >
                <DownloadIcon className="size-6" />
              </Button>
            )}
            {hasSelection && (
              <Button
                variant="ghost"
                size="icon-lg"
                className={headerButtonClassName}
                aria-label={t("generic.delete")}
                onClick={() => void deleteSelectedRecipes()}
              >
                <Trash2Icon className="size-6" />
              </Button>
            )}
            <HomePopover
              guestMode={!!userId}
              selectionMode={selectionMode}
              onDismiss={onHomePopoverDismiss}
            />
          </>
        }
      >
        {folder === "main" && (
          <div className="flex items-center gap-1 bg-background px-2 py-2 text-foreground">
            <InputGroup className="h-10 flex-1">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                inputMode="search"
                enterKeyHint="search"
                dir="auto"
                autoComplete="off"
                maxLength={SEARCH_TERM_LENGTH_LIMIT}
                placeholder={t("pages.home.search.placeholder")}
                className="[&::-webkit-search-cancel-button]:hidden"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={onSearchKeyDown}
              />
              {searchInput.length > 0 && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label={t("pages.home.search.clear")}
                    onClick={clearSearch}
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            <HomeSearchFilterPopover
              contextUserId={myProfile?.id || null}
              guestMode={!!userId}
              labels={labels}
              selectedLabels={selectedLabels}
              ratingFilter={ratingFilter}
              nutritionFilter={nutritionFilter}
              onDismiss={onSearchFilterDismiss}
            />
          </div>
        )}
      </PageHeader>
      <PageContent padded={false}>
        <div ref={contentRef} className="pb-24">
          {(isTiles || isListView) && hasRecipes && (
            <>
              {labelChips}
              <div
                ref={listRef}
                className="relative w-full"
                style={{ height: virtualizer.getTotalSize() }}
              >
                {virtualItems.map((virtualItem) => (
                  <div
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    className="absolute inset-x-0 top-0"
                    style={{
                      transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
                    }}
                  >
                    {renderVirtualRow(virtualItem.index)}
                  </div>
                ))}
              </div>
            </>
          )}
          {!hasRecipes && (
            <div>
              {labelChips}
              {loading && (
                <NullState icon={<Spinner />}>
                  <p>{t("pages.home.loading")}</p>
                </NullState>
              )}
              {!loading && searchText.length > 0 && (
                <NullState icon={<SearchIcon />}>
                  <p>
                    {t("pages.home.errors.noSearchResults.message1")}
                    <br />
                    <br />
                    {t("pages.home.errors.noSearchResults.message2")}
                    <br />
                    {t("pages.home.errors.noSearchResults.message3")}
                  </p>
                </NullState>
              )}
              {!loading && !searchText.length && folder === "inbox" && (
                <NullState icon={<MailOpenIcon />}>
                  <p>
                    {t("pages.home.errors.inboxEmpty.message1")}
                    <br />
                    {t("pages.home.errors.inboxEmpty.message2")}
                  </p>
                </NullState>
              )}
              {!loading &&
                !searchText.length &&
                folder === "main" &&
                userId &&
                !totalRecipeCount &&
                hasNoFilters && (
                  <NullState
                    icon={
                      <Link to="/about" aria-label={t("pages.app.nav.about")}>
                        <LogoIcon />
                      </Link>
                    }
                  >
                    <h2 className="mb-8 text-xl font-medium">
                      {t("pages.home.errors.emptyCollection.title")}
                    </h2>
                    <p>
                      {t("pages.home.errors.emptyCollection.message")}
                      <br />
                    </p>
                  </NullState>
                )}
              {!loading &&
                !searchText.length &&
                folder === "main" &&
                !userId &&
                !totalRecipeCount &&
                hasNoFilters && (
                  <NullState
                    icon={
                      <Link to="/about" aria-label={t("pages.app.nav.about")}>
                        <LogoIcon />
                      </Link>
                    }
                  >
                    <h2 className="mb-8 text-xl font-medium">
                      {t("pages.home.errors.noRecipes.title")}
                    </h2>
                    <p>
                      {t("pages.home.errors.noRecipes.message1")}
                      <br />
                      {t("pages.home.errors.noRecipes.message2")}
                      <br />
                      <b>{t("pages.home.errors.noRecipes.message3")}</b>
                      <br />
                      <br />
                      <a
                        href="https://docs.recipesage.com"
                        className="text-primary hover:underline"
                      >
                        {t("pages.home.errors.noRecipes.message7")}
                      </a>
                      <br />
                      <br />
                      {t("pages.home.errors.noRecipes.message4")}
                      <br />
                      {t("pages.home.errors.noRecipes.message5")}
                      <br />
                      <br />
                      {t("pages.home.errors.noRecipes.message6")}
                      <br />
                      <a
                        href="https://chrome.google.com/webstore/detail/oepplnnfceidfaaacjpdpobnjkcpgcpo"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-primary hover:underline"
                      >
                        Chrome
                      </a>{" "}
                      &amp;{" "}
                      <a
                        href="https://addons.mozilla.org/en-US/firefox/addon/recipesage/"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-primary hover:underline"
                      >
                        Firefox
                      </a>
                    </p>
                  </NullState>
                )}
              {!loading &&
                !searchText.length &&
                folder === "main" &&
                !hasNoFilters && (
                  <NullState icon={<FunnelIcon />}>
                    <p>{t("pages.home.errors.noResultsFilters")}</p>
                  </NullState>
                )}
            </div>
          )}
        </div>
      </PageContent>
      {!userId && folder !== "inbox" && (
        <Fab
          aria-label={t("pages.app.nav.newrecipe")}
          onClick={() =>
            void navigate({
              to: "/edit-recipe/$recipeId",
              params: { recipeId: "new" },
            })
          }
        >
          <PlusIcon />
        </Fab>
      )}
    </>
  );
};
