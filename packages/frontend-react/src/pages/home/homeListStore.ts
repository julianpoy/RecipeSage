import { create } from "zustand";
import type {
  LabelSummary,
  NutritionFilter,
  RecipeSummaryLite,
} from "@recipesage/prisma";
import {
  MyRecipesIncludeFriendsOptions,
  MyRecipesPreferenceKey,
  MyRecipesSortOptions,
  WSBroadcastEventType,
} from "@recipesage/util/shared";
import { EventName, events } from "../../services/events";
import { loadingService } from "../../services/loadingService";
import { serverActions } from "../../services/serverActions";
import type { RouterInputs } from "../../services/server-actions/ActionsBase";
import { websocketService } from "../../services/websocketService";
import { preferencesStore } from "../../stores/preferencesStore";
import { countActiveNutritionRanges } from "../../utils/nutritionFilter";
import { maybeRequestPersistentStorage } from "../../utils/persistentStorage";
import { session } from "../../utils/session";

export type HomeFolder = "main" | "inbox";

export interface HomeRouteParams {
  folder: HomeFolder;
  userId?: string;
  selectedLabels: string[];
}

export interface HomeFilters {
  selectedLabels: string[];
  ratingFilter: (number | null)[];
  nutritionFilter: NutritionFilter;
}

type GetRecipesInput = RouterInputs["recipes"]["getRecipes"];

const SORT_ORDER: Record<
  MyRecipesSortOptions,
  Pick<GetRecipesInput, "orderBy" | "orderDirection">
> = {
  [MyRecipesSortOptions.TitleAsc]: { orderBy: "title", orderDirection: "asc" },
  [MyRecipesSortOptions.CreatedAtDesc]: {
    orderBy: "createdAt",
    orderDirection: "desc",
  },
  [MyRecipesSortOptions.CreatedAtAsc]: {
    orderBy: "createdAt",
    orderDirection: "asc",
  },
  [MyRecipesSortOptions.UpdatedAtDesc]: {
    orderBy: "updatedAt",
    orderDirection: "desc",
  },
  [MyRecipesSortOptions.UpdatedAtAsc]: {
    orderBy: "updatedAt",
    orderDirection: "asc",
  },
  [MyRecipesSortOptions.LastMadeAtDesc]: {
    orderBy: "lastMadeAt",
    orderDirection: "desc",
  },
  [MyRecipesSortOptions.LastMadeAtAsc]: {
    orderBy: "lastMadeAt",
    orderDirection: "asc",
  },
};

const FETCH_PER_PAGE = 50;

const RELOAD_EVENTS = [
  EventName.RecipeCreated,
  EventName.RecipeUpdated,
  EventName.RecipeDeleted,
  EventName.LabelCreated,
  EventName.LabelUpdated,
  EventName.LabelDeleted,
  EventName.ApplicationOfflineModeChanged,
];

interface HomeListData extends HomeRouteParams {
  historyKey?: string;
  mounted: boolean;
  labels: LabelSummary[];
  recipes: (RecipeSummaryLite | undefined)[];
  totalRecipeCount?: number;
  recipesGeneration: number;
  loading: boolean;
  searchText: string;
  ratingFilter: (number | null)[];
  nutritionFilter: NutritionFilter;
  reloadPending: boolean;
  routeParamsVersion: number;
}

interface HomeListActions {
  enter: (params: HomeRouteParams, historyKey: string | undefined) => void;
  leave: () => void;
  setHistoryKey: (historyKey: string | undefined) => void;
  applyRouteParams: (params: HomeRouteParams) => boolean;
  applyFilters: (filters: HomeFilters) => void;
  isIncludeFriendsEnabled: () => boolean;
  hasActiveNutritionFilter: () => boolean;
  fetchMoreRecipes: (target: number) => Promise<void>;
  resetAndLoadAll: (scrollToLastPosition?: boolean) => Promise<void>;
  resetAndLoadRecipes: (scrollToLastPosition?: boolean) => Promise<void>;
  search: (text: string, existingGeneration?: number) => Promise<void>;
  toggleLabel: (labelTitle: string) => void;
}

let recipeLoadGeneration = 0;
const inFlightFetches = new Map<number, Promise<void>>();
const loadedOffsets = new Set<number>();

const createInitialData = (params: HomeRouteParams): HomeListData => ({
  ...params,
  historyKey: undefined,
  mounted: false,
  labels: [],
  recipes: [],
  totalRecipeCount: undefined,
  recipesGeneration: recipeLoadGeneration,
  loading: true,
  searchText: "",
  ratingFilter: [],
  nutritionFilter: {},
  reloadPending: true,
  routeParamsVersion: 0,
});

const sortLabels = (labels: LabelSummary[]) =>
  labels.sort((a, b) => a.title.localeCompare(b.title));

const routeParamsEqual = (a: HomeRouteParams, b: HomeRouteParams) =>
  a.folder === b.folder &&
  a.userId === b.userId &&
  a.selectedLabels.join(",") === b.selectedLabels.join(",");

export const homeListStore = create<HomeListData & HomeListActions>(
  (set, get) => {
    const scrollToTop = () => {
      if (!get().mounted) return;
      window.scrollTo({ top: 0 });
    };

    const activeNutritionFilter = (): NutritionFilter | undefined =>
      get().hasActiveNutritionFilter() ? get().nutritionFilter : undefined;

    const resetRecipes = (preserveExisting: boolean) => {
      inFlightFetches.clear();
      loadedOffsets.clear();
      if (preserveExisting) return;
      set({ recipes: [], totalRecipeCount: undefined });
    };

    const doLoadRecipes = async (offset: number) => {
      const generation = recipeLoadGeneration;
      const { folder, selectedLabels, ratingFilter, userId } = get();
      const preferences = preferencesStore.getState().preferences;
      const sortOrder = SORT_ORDER[preferences[MyRecipesPreferenceKey.SortBy]];

      const result = await serverActions.recipes.getRecipes({
        folder,
        orderBy: sortOrder.orderBy,
        orderDirection: sortOrder.orderDirection,
        offset,
        limit: FETCH_PER_PAGE,
        labels: selectedLabels.length ? selectedLabels : undefined,
        labelIntersection:
          preferences[MyRecipesPreferenceKey.EnableLabelIntersection],
        includeAllFriends: get().isIncludeFriendsEnabled(),
        ratings: ratingFilter.length ? ratingFilter : undefined,
        nutritionFilter: activeNutritionFilter(),
        userIds: userId ? [userId] : undefined,
      });

      if (recipeLoadGeneration !== generation) return;
      if (!result) return;

      loadedOffsets.add(offset);
      set((state) => {
        const recipes = state.recipes.slice();
        result.recipes.forEach((recipe, idx) => {
          recipes[offset + idx] = recipe;
        });
        if (recipes.length > result.totalCount) {
          recipes.length = result.totalCount;
        }
        return { recipes, totalRecipeCount: result.totalCount };
      });
    };

    const loadRecipes = (offset: number): Promise<void> => {
      const existing = inFlightFetches.get(offset);
      if (existing) return existing;

      const promise = doLoadRecipes(offset).finally(() => {
        if (inFlightFetches.get(offset) === promise) {
          inFlightFetches.delete(offset);
        }
      });
      inFlightFetches.set(offset, promise);
      return promise;
    };

    const loadLabels = async (): Promise<LabelSummary[] | undefined> => {
      const { userId } = get();
      if (userId) {
        const response = await serverActions.labels.getLabelsByUserId(
          {
            userIds: [userId],
          },
          {
            401: () => {},
          },
        );
        return response ? sortLabels(response) : undefined;
      }
      if (get().isIncludeFriendsEnabled()) {
        const response = await serverActions.labels.getAllVisibleLabels({
          401: () => {},
        });
        return response ? sortLabels(response) : undefined;
      }
      const response = await serverActions.labels.getLabels({
        401: () => {},
      });
      return response ? sortLabels(response) : undefined;
    };

    const resetAndLoadLabels = async () => {
      const labels = await loadLabels();
      set({ labels: labels || [] });
    };

    return {
      ...createInitialData({ folder: "main", selectedLabels: [] }),

      enter: (params, historyKey) => {
        const state = get();
        const isSameEntry =
          historyKey !== undefined && state.historyKey === historyKey;

        if (!isSameEntry) {
          recipeLoadGeneration++;
          inFlightFetches.clear();
          loadedOffsets.clear();
          set({
            ...createInitialData(params),
            historyKey,
            mounted: true,
          });
          return;
        }

        set({ mounted: true });
        if (!routeParamsEqual(state, params)) {
          set({ ...params, reloadPending: true });
        }
      },

      leave: () => {
        set({ mounted: false });
      },

      setHistoryKey: (historyKey) => {
        if (historyKey === undefined) return;
        set({ historyKey });
      },

      applyRouteParams: (params) => {
        if (routeParamsEqual(get(), params)) return false;
        set((state) => ({
          ...params,
          routeParamsVersion: state.routeParamsVersion + 1,
        }));
        return true;
      },

      applyFilters: (filters) => {
        set({
          selectedLabels: filters.selectedLabels,
          ratingFilter: filters.ratingFilter,
          nutritionFilter: filters.nutritionFilter,
        });
      },

      isIncludeFriendsEnabled: () => {
        const includeFriends =
          preferencesStore.getState().preferences[
            MyRecipesPreferenceKey.IncludeFriends
          ];
        return (
          !get().userId &&
          (includeFriends === MyRecipesIncludeFriendsOptions.Yes ||
            includeFriends === MyRecipesIncludeFriendsOptions.Browse)
        );
      },

      hasActiveNutritionFilter: () =>
        countActiveNutritionRanges(get().nutritionFilter) > 0,

      fetchMoreRecipes: async (target) => {
        const { searchText, totalRecipeCount } = get();
        if (searchText) return;
        if (totalRecipeCount === undefined) return;

        const limit = Math.min(target, totalRecipeCount);
        const promises: Promise<void>[] = [];
        for (let offset = 0; offset < limit; offset += FETCH_PER_PAGE) {
          if (!loadedOffsets.has(offset)) {
            promises.push(loadRecipes(offset));
          }
        }

        await Promise.all(promises);
      },

      resetAndLoadAll: async (scrollToLastPosition) => {
        set({ reloadPending: false });

        const { selectedLabels, userId } = get();
        if (selectedLabels.length === 0 || userId) {
          await Promise.all([
            resetAndLoadLabels(),
            get().resetAndLoadRecipes(scrollToLastPosition),
          ]);
          return;
        }

        await resetAndLoadLabels();
        const labelNames = new Set(get().labels.map((label) => label.title));

        const previousLabels = get().selectedLabels;
        const filteredLabels = previousLabels.filter(
          (labelTitle) =>
            labelNames.has(labelTitle) || labelTitle === "unlabeled",
        );
        if (filteredLabels.length !== previousLabels.length) {
          set({ selectedLabels: filteredLabels });
        }

        await get().resetAndLoadRecipes(scrollToLastPosition);
      },

      resetAndLoadRecipes: async (scrollToLastPosition) => {
        const generation = ++recipeLoadGeneration;
        set({ loading: true, recipesGeneration: generation });
        resetRecipes(!!scrollToLastPosition);
        if (!scrollToLastPosition) scrollToTop();

        try {
          const { searchText } = get();
          if (searchText && searchText.trim().length > 0) {
            await get().search(searchText, generation);
          } else {
            await loadRecipes(0);
          }

          const { userId, folder, totalRecipeCount } = get();
          if (
            recipeLoadGeneration === generation &&
            session.isLoggedIn() &&
            !userId &&
            folder === "main" &&
            totalRecipeCount
          ) {
            void maybeRequestPersistentStorage();
          }
        } finally {
          if (recipeLoadGeneration === generation) {
            set({ loading: false });
          }
        }
      },

      search: async (text, existingGeneration) => {
        if (text.trim().length === 0) {
          set({ searchText: "" });
          void get().resetAndLoadRecipes();
          return;
        }

        const generation = existingGeneration ?? ++recipeLoadGeneration;
        const loading = loadingService.start();

        set({ searchText: text });

        const { folder, selectedLabels, ratingFilter, userId } = get();
        const preferences = preferencesStore.getState().preferences;
        const includeFriends =
          preferences[MyRecipesPreferenceKey.IncludeFriends];
        const includeAllFriends =
          !userId &&
          (includeFriends === MyRecipesIncludeFriendsOptions.Yes ||
            includeFriends === MyRecipesIncludeFriendsOptions.Search);

        const result = await serverActions.recipes
          .searchRecipes({
            searchTerm: text,
            folder,
            labels: selectedLabels.length ? selectedLabels : undefined,
            labelIntersection:
              preferences[MyRecipesPreferenceKey.EnableLabelIntersection],
            includeAllFriends,
            ratings: ratingFilter.length ? ratingFilter : undefined,
            nutritionFilter: activeNutritionFilter(),
            userIds: userId ? [userId] : undefined,
          })
          .finally(loading.dismiss);

        if (recipeLoadGeneration !== generation) return;

        resetRecipes(true);
        set({
          recipes: result?.recipes || [],
          totalRecipeCount: undefined,
          recipesGeneration: generation,
          loading: false,
        });
        scrollToTop();
      },

      toggleLabel: (labelTitle) => {
        const { selectedLabels } = get();
        set({
          selectedLabels: selectedLabels.includes(labelTitle)
            ? selectedLabels.filter((title) => title !== labelTitle)
            : [...selectedLabels, labelTitle],
        });
        void get().resetAndLoadRecipes();
      },
    };
  },
);

events.subscribe(RELOAD_EVENTS, () => {
  homeListStore.setState({ reloadPending: true });
});

events.subscribe(EventName.ImportPepperplateComplete, () => {
  const state = homeListStore.getState();
  if (!state.mounted) {
    homeListStore.setState({ reloadPending: true });
    return;
  }

  const loading = loadingService.start();
  void state.resetAndLoadAll(true).finally(() => {
    loading.dismiss();
  });
});

websocketService.on(WSBroadcastEventType.MessageReceived, (data) => {
  const state = homeListStore.getState();
  if (!data.recipe || state.folder !== "inbox") return;

  if (!state.mounted) {
    homeListStore.setState({ reloadPending: true });
    return;
  }

  void state.resetAndLoadRecipes();
});
