import { useEffect, useRef, useState } from "react";
import { FolderOpenIcon, SearchIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SEARCH_TERM_LENGTH_LIMIT } from "@recipesage/util/shared";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { CachedImage } from "../CachedImage";
import { loadingService } from "../../services/loadingService";
import { serverActions } from "../../services/serverActions";
import type { RouterOutputs } from "../../services/server-actions/ActionsBase";

export type DiscoverRecipeSummary =
  RouterOutputs["discover"]["searchDiscoverRecipes"]["recipes"][number];
type DiscoverRecipeAuthor = DiscoverRecipeSummary["author"];

const PAUSE_BEFORE_SEARCH = 500;

const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const extractDiscoverRecipeId = (text: string): string | null => {
  const match = text.match(UUID_REGEX);
  return match ? match[0] : null;
};

const authorDisplay = (author: DiscoverRecipeAuthor) =>
  author.handle ? `@${author.handle}` : author.name;

export const SelectDiscoverRecipe = ({
  excludeIds = [],
  onRecipeSelected,
}: {
  excludeIds?: string[];
  onRecipeSelected: (recipe: DiscoverRecipeSummary) => void;
}) => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [recipes, setRecipes] = useState<DiscoverRecipeSummary[]>([]);
  const [lastQueryWasId, setLastQueryWasId] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchRequestIdRef = useRef(0);

  useEffect(
    () => () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    },
    [],
  );

  const search = async (text: string) => {
    const requestId = ++searchRequestIdRef.current;
    const id = extractDiscoverRecipeId(text);
    setLastQueryWasId(!!id);

    const loading = loadingService.start();

    if (id) {
      const response = await serverActions.discover.getDiscoverRecipe(
        { id },
        { 404: () => {} },
      );
      loading.dismiss();
      if (requestId !== searchRequestIdRef.current) return;
      setSearching(false);

      if (!response || excludeIds.includes(response.id)) {
        setRecipes([]);
        return;
      }

      setRecipes([response]);
      return;
    }

    const response = await serverActions.discover.searchDiscoverRecipes({
      searchTerm: text,
    });
    loading.dismiss();
    if (requestId !== searchRequestIdRef.current) return;
    setSearching(false);

    if (!response) return;

    setRecipes(
      response.recipes.filter((recipe) => !excludeIds.includes(recipe.id)),
    );
  };

  const onSearchInputChange = (value: string) => {
    setSearchText(value);
    setRecipes([]);
    searchRequestIdRef.current++;
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    const text = value.trim();
    if (!text) {
      setSearching(false);
      return;
    }

    setSearching(true);

    searchTimeoutRef.current = setTimeout(() => {
      void search(text);
    }, PAUSE_BEFORE_SEARCH);
  };

  const select = (recipe: DiscoverRecipeSummary) => {
    onRecipeSelected(recipe);
    setSearchText("");
    setRecipes([]);
  };

  return (
    <div className="py-2">
      <InputGroup className="h-10">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          dir="auto"
          autoComplete="off"
          maxLength={SEARCH_TERM_LENGTH_LIMIT}
          placeholder={t("components.selectDiscoverRecipe.search")}
          value={searchText}
          onChange={(event) => onSearchInputChange(event.target.value)}
        />
      </InputGroup>
      {searchText.length > 0 && (
        <div className="relative px-4">
          <div className="absolute inset-x-4 z-20 mt-1 max-h-[300px] overflow-y-auto rounded-2xl bg-secondary text-secondary-foreground shadow-[1px_1px_7px_rgba(0,0,0,0.4)]">
            {recipes.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                className="flex w-full cursor-pointer items-center gap-4 px-4 py-2.5 text-start outline-none hover:bg-accent focus-visible:bg-accent"
                onClick={() => select(recipe)}
              >
                {recipe.discoverRecipeImages.length ? (
                  <CachedImage
                    src={recipe.discoverRecipeImages[0].image.location}
                    className="size-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <img
                    src="assets/imgs/logo_green_padded.png"
                    alt=""
                    className="size-10 shrink-0 rounded-full object-cover"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span dir="auto" className="block truncate text-base">
                    {recipe.title}
                  </span>
                  <span
                    dir="auto"
                    className="block truncate text-sm text-muted-foreground"
                  >
                    {t("pages.discover.recipe.by", {
                      handle: authorDisplay(recipe.author),
                    })}
                  </span>
                  {recipe.description && (
                    <span
                      dir="auto"
                      className="block truncate text-sm text-muted-foreground"
                    >
                      {recipe.description}
                    </span>
                  )}
                </span>
              </button>
            ))}
            {searching && (
              <div className="flex items-center gap-4 px-4 py-3">
                <Spinner className="size-6" />
                <span className="min-w-0 break-words">
                  {t("components.selectDiscoverRecipe.searching", {
                    searchText,
                  })}
                </span>
              </div>
            )}
            {recipes.length === 0 && searchText.length > 0 && !searching && (
              <div className="flex items-center gap-4 px-4 py-3">
                <FolderOpenIcon className="size-6 shrink-0" />
                <span className="min-w-0 break-words">
                  {lastQueryWasId
                    ? t("components.selectDiscoverRecipe.idNotFound")
                    : t("components.selectDiscoverRecipe.null", {
                        searchText,
                      })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
