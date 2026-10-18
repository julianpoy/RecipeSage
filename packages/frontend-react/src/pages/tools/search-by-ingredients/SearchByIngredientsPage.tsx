import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchIcon, ShoppingBasketIcon, UtensilsIcon } from "lucide-react";
import type { RecipeSummaryLite } from "@recipesage/prisma";
import {
  MyRecipesPreferenceKey,
  SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERM_LENGTH,
  SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERMS,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { TextArea } from "../../../components/forms/TextArea";
import { InfoBlock } from "../../../components/info-block/InfoBlock";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { NullState } from "../../../components/NullState";
import { RecipeListItem } from "../../../components/recipe-list-item/RecipeListItem";
import { useNavigateOrOpenWindow } from "../../../hooks/useNavigateOrOpenWindow";
import { useOfflineFirstQuery } from "../../../hooks/useOfflineFirstQuery";
import type { RouterOutputs } from "../../../services/server-actions/ActionsBase";
import { serverActions } from "../../../services/serverActions";
import { preferencesStore } from "../../../stores/preferencesStore";
import { createHistoryEntrySnapshotStore } from "../createHistoryEntrySnapshotStore";

type IngredientSearchResult =
  RouterOutputs["recipes"]["searchRecipesByIngredients"]["results"][number];

interface SearchByIngredientsSnapshot {
  ingredientsText: string;
  includeFriends: boolean;
  hasSearched: boolean;
  totalTerms: number;
  results: IngredientSearchResult[];
}

const snapshotStore =
  createHistoryEntrySnapshotStore<SearchByIngredientsSnapshot>();

const parseTerms = (text: string): string[] => {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const raw of text.split(/[\n,]+/)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.length > SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERM_LENGTH)
      continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    terms.push(trimmed);

    if (terms.length >= SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERMS) break;
  }

  return terms;
};

export const SearchByIngredientsPage = () => {
  const { t } = useTranslation();
  const navigateOrOpenWindow = useNavigateOrOpenWindow();
  const friendsToggleId = useId();

  const preferences = preferencesStore((state) => state.preferences);
  const myProfileQuery = useOfflineFirstQuery(
    serverActions.users.getMe({
      401: () => {},
    }),
  );
  const myProfile = myProfileQuery.data;

  const restored = snapshotStore.useRestoredSnapshot();

  const [ingredientsText, setIngredientsText] = useState(
    () => restored?.ingredientsText ?? "",
  );
  const [includeFriends, setIncludeFriends] = useState(
    () => restored?.includeFriends ?? false,
  );
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(
    () => restored?.hasSearched ?? false,
  );
  const [totalTerms, setTotalTerms] = useState(() => restored?.totalTerms ?? 0);
  const [results, setResults] = useState<IngredientSearchResult[]>(
    () => restored?.results ?? [],
  );

  const searchGenerationRef = useRef(0);

  snapshotStore.useSaveSnapshot({
    ingredientsText,
    includeFriends,
    hasSearched,
    totalTerms,
    results,
  });

  const viewType =
    preferences[MyRecipesPreferenceKey.ViewType] === "compact"
      ? "compact"
      : "list";

  const search = async (text: string, withFriends: boolean) => {
    const terms = parseTerms(text);
    const generation = ++searchGenerationRef.current;

    if (!terms.length) {
      setLoading(false);
      setHasSearched(false);
      setTotalTerms(0);
      setResults([]);
      return;
    }

    setLoading(true);

    const response = await serverActions.recipes
      .searchRecipesByIngredients({
        ingredients: terms,
        includeAllFriends: withFriends || undefined,
      })
      .finally(() => {
        if (generation === searchGenerationRef.current) setLoading(false);
      });

    if (generation !== searchGenerationRef.current) return;

    if (!response) {
      setHasSearched(false);
      setTotalTerms(0);
      setResults([]);
      return;
    }

    setHasSearched(true);
    setTotalTerms(terms.length);
    setResults(response.results);
  };

  const onIncludeFriendsChange = (checked: boolean) => {
    setIncludeFriends(checked);
    if (ingredientsText.trim()) void search(ingredientsText, checked);
  };

  const isFromAnotherUser = (recipe: RecipeSummaryLite): boolean =>
    !!myProfile && recipe.userId !== myProfile.id;

  const getRecipeBadgeHandle = (
    recipe: RecipeSummaryLite,
  ): string | undefined => {
    if (!isFromAnotherUser(recipe)) return undefined;
    return recipe.user.handle ?? undefined;
  };

  const isFromSharedCollection = (recipe: RecipeSummaryLite): boolean => {
    if (!isFromAnotherUser(recipe)) return false;
    return !recipe.user.handle;
  };

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/tools" }} />}
        title={t("pages.searchByIngredients.title")}
      />
      <PageContent padded={false}>
        <div className="mx-auto max-w-page p-4">
          <InfoBlock
            className="mb-3"
            icon={<ShoppingBasketIcon />}
            ariaLabel={t("pages.searchByIngredients.info.title")}
            title={t("pages.searchByIngredients.info.title")}
          >
            <p>{t("pages.searchByIngredients.info.body1")}</p>
            <p>{t("pages.searchByIngredients.info.body2")}</p>
          </InfoBlock>

          <div className="mb-2">
            <TextArea
              label={t("pages.searchByIngredients.field.label")}
              placeholder={t("pages.searchByIngredients.field.placeholder")}
              helperText={t("pages.searchByIngredients.field.helper")}
              value={ingredientsText}
              onValueChange={setIngredientsText}
              rows={5}
              autoGrow
            />
          </div>

          <label
            htmlFor={friendsToggleId}
            className="mb-3 flex min-h-11 cursor-pointer items-center justify-between gap-4"
          >
            <span className="min-w-0 flex-1 break-words">
              {t("pages.searchByIngredients.includeFriends")}
            </span>
            <Switch
              id={friendsToggleId}
              checked={includeFriends}
              onCheckedChange={onIncludeFriendsChange}
            />
          </label>

          <Button
            size="lg"
            className="mb-1 w-full"
            disabled={loading}
            onClick={() => void search(ingredientsText, includeFriends)}
          >
            <SearchIcon data-icon="inline-start" />
            {t("pages.searchByIngredients.searchButton")}
          </Button>

          {loading ? (
            <NullState icon={<Spinner />}>
              <p>{t("pages.searchByIngredients.searching")}</p>
            </NullState>
          ) : (
            hasSearched &&
            results.length === 0 && (
              <NullState icon={<UtensilsIcon />}>
                <p>{t("pages.searchByIngredients.noResults")}</p>
              </NullState>
            )
          )}
        </div>

        {!loading && results.length > 0 && (
          <div className="border-t pb-[25vh]">
            {results.map((result) => (
              <RecipeListItem
                key={result.recipe.id}
                recipe={result.recipe}
                viewType={viewType}
                showImage={preferences[MyRecipesPreferenceKey.ShowImages]}
                showDescription={
                  preferences[MyRecipesPreferenceKey.ShowRecipeDescription]
                }
                showSource={preferences[MyRecipesPreferenceKey.ShowSource]}
                showLabels={preferences[MyRecipesPreferenceKey.ShowLabels]}
                showRating={preferences[MyRecipesPreferenceKey.ShowRating]}
                badgeHandle={getRecipeBadgeHandle(result.recipe)}
                fromSharedCollection={isFromSharedCollection(result.recipe)}
                onRecipeClick={(event) =>
                  navigateOrOpenWindow(`/recipe/${result.recipe.id}`, event)
                }
              >
                <p
                  dir="auto"
                  className="mb-0.5! truncate text-[0.8rem] font-semibold text-match"
                >
                  {t("pages.searchByIngredients.matchLabel", {
                    matched: result.matchedTerms.length,
                    total: totalTerms,
                  })}
                </p>
              </RecipeListItem>
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
};
