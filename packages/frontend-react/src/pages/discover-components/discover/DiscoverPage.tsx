import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useTranslation } from "react-i18next";
import { SearchIcon } from "lucide-react";
import {
  MyRecipesPreferenceKey,
  MyRecipesViewTypeOptions,
  SEARCH_TERM_LENGTH_LIMIT,
} from "@recipesage/util/shared";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { PageHeader } from "../../../components/layout/PageHeader";
import { PageContent } from "../../../components/layout/PageContent";
import { Rating } from "../../../components/rating/Rating";
import { loadingService } from "../../../services/loadingService";
import { serverActions } from "../../../services/serverActions";
import type { RouterOutputs } from "../../../services/server-actions/ActionsBase";
import { preferencesStore } from "../../../stores/preferencesStore";
import {
  getDefaultDiscoverLanguages,
  getDiscoverLanguageOptions,
} from "../../../utils/discoverLanguages";
import { getCurrentLocale } from "../../../utils/formatDate";
import { resolveStorageLocation } from "../../../utils/resolveStorageLocation";
import {
  DiscoverFilterPopover,
  type DiscoverFilters,
} from "../discover-filter-popover/DiscoverFilterPopover";
import {
  DiscoverPopover,
  type DiscoverSortBy,
} from "../discover-popover/DiscoverPopover";

type DiscoverRecipeSummary =
  RouterOutputs["discover"]["searchDiscoverRecipes"]["recipes"][number];
type DiscoverRecipeAuthor = DiscoverRecipeSummary["author"];

interface DiscoverQuery {
  searchTerm: string;
  filters: DiscoverFilters;
  sortBy: DiscoverSortBy;
  generation: number;
}

const EMPTY_RECIPES: DiscoverRecipeSummary[] = [];

const routeApi = getRouteApi("/discover");

const PAGE_SIZE = 40;
const TILE_WIDTH = 200;
const TILE_PADD = 20;
const LOAD_MORE_THRESHOLD_ROWS = 5;

const TILE_ROW_ESTIMATE = 346;
const LIST_ROW_ESTIMATE = 133;

const authorDisplay = (author: DiscoverRecipeAuthor) =>
  author.handle ? `@${author.handle}` : author.name;

const parseCategoriesParam = (categoriesParam: string) =>
  categoriesParam
    .split(",")
    .map((category) => decodeURIComponent(category))
    .filter((category) => category.length > 0);

const DiscoverRecipeImage = ({
  recipe,
  className,
}: {
  recipe: DiscoverRecipeSummary;
  className?: string;
}) =>
  recipe.discoverRecipeImages.length ? (
    <img
      loading="lazy"
      decoding="async"
      alt={recipe.title}
      className={className}
      src={resolveStorageLocation(
        recipe.discoverRecipeImages[0].image.location,
      )}
    />
  ) : (
    <img
      loading="lazy"
      decoding="async"
      alt=""
      className={className}
      src="assets/imgs/logo_green.png"
    />
  );

const DiscoverRecipeText = ({ recipe }: { recipe: DiscoverRecipeSummary }) => {
  const { t } = useTranslation();

  return (
    <>
      <h2
        dir="auto"
        title={recipe.title}
        className="mb-1 h-[1.188rem] truncate text-base font-medium leading-[1.188rem]"
      >
        {recipe.title}
      </h2>
      <p
        dir="auto"
        title={recipe.description}
        className="mb-1 line-clamp-2 h-[2.376rem] text-sm leading-[1.188rem]"
      >
        {recipe.description}
      </p>
      <p
        dir="auto"
        className="mb-1 h-[1.188rem] truncate text-sm leading-[1.188rem] text-foreground/75 italic"
      >
        {t("pages.discover.recipe.by", {
          handle: authorDisplay(recipe.author),
        })}
      </p>
      <div className="flex h-10 items-center gap-2 overflow-hidden text-[0.8125rem] leading-tight text-foreground/70">
        {!!recipe.ratingCount && (
          <>
            <Rating
              rating={recipe.ratingAverage}
              className="shrink-0 text-sm"
            />
            <span>
              {t("pages.discoverRecipe.ratingCount", {
                count: recipe.ratingCount,
              })}
            </span>
          </>
        )}
        <span>
          {t("pages.discover.recipe.saves", { count: recipe.saveCount })}
        </span>
      </div>
    </>
  );
};

const DiscoverRecipeCard = ({
  recipe,
  fullWidth,
}: {
  recipe: DiscoverRecipeSummary;
  fullWidth: boolean;
}) => (
  <Link
    to="/discover/$discoverRecipeId"
    params={{ discoverRecipeId: recipe.id }}
    className={cn(
      "block h-[calc(190px+1.5rem+1.188rem*4+2.5rem)] min-w-0 cursor-pointer overflow-hidden rounded-md bg-card text-card-foreground shadow-[0_1px_4px_rgba(0,0,0,0.18)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      fullWidth ? "w-full" : "w-[200px]",
    )}
  >
    <DiscoverRecipeImage
      recipe={recipe}
      className="block h-[190px] w-full object-cover"
    />
    <div className="px-2.5 pt-2 pb-2.5">
      <DiscoverRecipeText recipe={recipe} />
    </div>
  </Link>
);

const DiscoverRecipeListItem = ({
  recipe,
}: {
  recipe: DiscoverRecipeSummary;
}) => (
  <div className="border-b hover:bg-muted">
    <Link
      to="/discover/$discoverRecipeId"
      params={{ discoverRecipeId: recipe.id }}
      className="grid h-[calc(1rem+1.188rem*4+2.5rem)] cursor-pointer grid-cols-[80px_minmax(0,1fr)] items-start gap-3 overflow-hidden px-3 py-2 focus-visible:bg-muted focus-visible:outline-none"
    >
      <DiscoverRecipeImage
        recipe={recipe}
        className="size-20 rounded-sm object-cover shadow-[1px_1px_7px_rgba(0,0,0,0.3)]"
      />
      <div className="min-w-0 [&_h2]:mb-0.5 [&_p]:mb-0.5">
        <DiscoverRecipeText recipe={recipe} />
      </div>
    </Link>
  </div>
);

export const DiscoverPage = () => {
  const { t } = useTranslation();
  const { categories: categoriesParam } = routeApi.useSearch();
  const viewType = preferencesStore(
    (state) => state.preferences[MyRecipesPreferenceKey.ViewType],
  );
  const isTiled = viewType === MyRecipesViewTypeOptions.Tiles;

  const [languageOptions] = useState(() =>
    getDiscoverLanguageOptions(getCurrentLocale()),
  );

  const [query, setQuery] = useState<DiscoverQuery>(() => ({
    searchTerm: "",
    filters: {
      languages: getDefaultDiscoverLanguages(getCurrentLocale()),
      categories: categoriesParam ? parseCategoriesParam(categoriesParam) : [],
      matchAllCategories: false,
      minRating: 0,
      minRatingCount: 0,
      photo: "optional",
    },
    sortBy: "trending",
    generation: 0,
  }));
  const [appliedCategoriesParam, setAppliedCategoriesParam] =
    useState(categoriesParam);
  if (categoriesParam !== appliedCategoriesParam) {
    setAppliedCategoriesParam(categoriesParam);
    setQuery((prev) => ({
      ...prev,
      filters: categoriesParam
        ? {
            ...prev.filters,
            categories: parseCategoriesParam(categoriesParam),
          }
        : prev.filters,
      generation: prev.generation + 1,
    }));
  }

  const [searchInput, setSearchInput] = useState("");
  const [tileColCount, setTileColCount] = useState(1);
  const [listOffset, setListOffset] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const searchQuery = useInfiniteQuery({
    queryKey: ["discover.searchDiscoverRecipes", query],
    gcTime: 0,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { filters } = query;
      const response = await serverActions.discover.searchDiscoverRecipes({
        searchTerm: query.searchTerm.trim() || undefined,
        languages: filters.languages.length ? filters.languages : undefined,
        categories: filters.categories.length ? filters.categories : undefined,
        matchAllCategories: filters.matchAllCategories || undefined,
        minRating: filters.minRating || undefined,
        minRatingCount: filters.minRatingCount || undefined,
        photo: filters.photo,
        sortBy: query.sortBy,
        offset: pageParam,
        limit: PAGE_SIZE,
      });
      return response ?? null;
    },
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage && lastPage.recipes.length >= PAGE_SIZE
        ? lastPageParam + lastPage.recipes.length
        : undefined,
  });

  const pages = searchQuery.data?.pages;
  const recipes = useMemo(
    () => pages?.flatMap((page) => page?.recipes ?? []) ?? EMPTY_RECIPES,
    [pages],
  );
  const loadedAny = !!pages?.some((page) => page !== null);
  const showPublishCta = loadedAny && !query.searchTerm.trim();

  const isReloading = searchQuery.isFetching && !searchQuery.isFetchingNextPage;
  useEffect(() => {
    if (!isReloading) return;
    const loading = loadingService.start();
    return () => loading.dismiss();
  }, [isReloading]);

  const updateQuery = (update: Partial<Omit<DiscoverQuery, "generation">>) => {
    setQuery((prev) => ({
      ...prev,
      ...update,
      generation: prev.generation + 1,
    }));
    window.scrollTo({ top: 0 });
  };

  useLayoutEffect(() => {
    const element = listRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      setTileColCount(
        Math.max(Math.floor(element.clientWidth / (TILE_WIDTH + TILE_PADD)), 1),
      );
      setListOffset(element.getBoundingClientRect().top + window.scrollY);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [showPublishCta]);

  const columnCount = isTiled ? tileColCount : 1;
  const rowCount = Math.ceil(recipes.length / columnCount);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => (isTiled ? TILE_ROW_ESTIMATE : LIST_ROW_ESTIMATE),
    overscan: 4,
    scrollMargin: listOffset,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const lastVirtualIndex = virtualItems.at(-1)?.index ?? -1;

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = searchQuery;
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    if (lastVirtualIndex < rowCount - LOAD_MORE_THRESHOLD_ROWS) return;

    void fetchNextPage();
  }, [
    lastVirtualIndex,
    rowCount,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  const onSearchChange = (value: string) => {
    updateQuery({ searchTerm: value });
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    onSearchChange(event.currentTarget.value);
  };

  return (
    <>
      <PageHeader
        title={t("pages.discover.title")}
        end={
          <DiscoverPopover
            sortBy={query.sortBy}
            onSortByChange={(sortBy) => updateQuery({ sortBy })}
          />
        }
      />
      <PageContent padded={false}>
        <div className="mx-auto flex max-w-page items-center gap-1 px-2 py-1">
          <InputGroup className="h-10 flex-1">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              dir="auto"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              maxLength={SEARCH_TERM_LENGTH_LIMIT}
              placeholder={t("pages.discover.search.placeholder")}
              aria-label={t("pages.discover.search.placeholder")}
              value={searchInput}
              onChange={(event) => {
                const value = event.target.value;
                setSearchInput(value);
                if (!value && query.searchTerm) onSearchChange("");
              }}
              onKeyDown={onSearchKeyDown}
            />
          </InputGroup>
          <DiscoverFilterPopover
            languageOptions={languageOptions}
            filters={query.filters}
            onFiltersChange={(filters) => updateQuery({ filters })}
          />
        </div>

        {showPublishCta && (
          <p className="mx-auto max-w-[600px] px-4 pt-6 pb-8 text-center text-sm leading-snug text-foreground/60">
            {t("pages.discover.publishCta")}
          </p>
        )}

        <div ref={listRef}>
          {recipes.length > 0 && (
            <div
              className="relative w-full"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualItems.map((virtualRow) => {
                const rowRecipes = recipes.slice(
                  virtualRow.index * columnCount,
                  virtualRow.index * columnCount + columnCount,
                );
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    className="absolute inset-x-0 top-0"
                    style={{
                      transform: `translateY(${
                        virtualRow.start - virtualizer.options.scrollMargin
                      }px)`,
                    }}
                  >
                    {isTiled ? (
                      <div className="flex flex-wrap justify-center gap-4 p-2.5">
                        {rowRecipes.map((recipe) => (
                          <DiscoverRecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            fullWidth={tileColCount === 1}
                          />
                        ))}
                      </div>
                    ) : (
                      rowRecipes.map((recipe) => (
                        <DiscoverRecipeListItem
                          key={recipe.id}
                          recipe={recipe}
                        />
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {loadedAny && recipes.length === 0 && (
          <div className="px-4 py-12 text-center text-foreground/60">
            <SearchIcon aria-hidden="true" className="mx-auto size-16" />
            <h2 className="my-4 text-xl font-medium">
              {t("pages.discover.empty.title")}
            </h2>
            <p>{t("pages.discover.empty.message")}</p>
          </div>
        )}
      </PageContent>
    </>
  );
};
