import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderOpenIcon, SearchIcon } from "lucide-react";
import type { RecipeSummary, RecipeSummaryLite } from "@recipesage/prisma";
import { SEARCH_TERM_LENGTH_LIMIT } from "@recipesage/util/shared";
import { Badge } from "@/components/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { useActionQuery } from "../../hooks/useActionQuery";
import { useOfflineFirstQuery } from "../../hooks/useOfflineFirstQuery";
import { usePropSyncedState } from "../../hooks/usePropSyncedState";
import { loadingService } from "../../services/loadingService";
import { serverActions } from "../../services/serverActions";
import { CachedImage } from "../CachedImage";

const PAUSE_BEFORE_SEARCH = 500;

const RecipeAvatar = ({
  recipe,
}: {
  recipe: Pick<RecipeSummaryLite, "recipeImages">;
}) => {
  const location = recipe.recipeImages.at(0)?.image.location;

  return location ? (
    <CachedImage
      src={location}
      className="size-10 shrink-0 rounded-full object-cover"
    />
  ) : (
    <img
      src="assets/imgs/logo_green_padded.png"
      alt=""
      className="size-10 shrink-0 rounded-full object-cover"
    />
  );
};

export const SelectRecipe = ({
  selectedRecipe: selectedRecipeInput,
  onSelectedRecipeChange,
  includeAllFriends = false,
  enableSelectedState = true,
}: {
  selectedRecipe?: RecipeSummary;
  onSelectedRecipeChange?: (recipe: RecipeSummary | undefined) => void;
  includeAllFriends?: boolean;
  enableSelectedState?: boolean;
}) => {
  const { t } = useTranslation();
  const [selectedRecipe, setSelectedRecipeState] =
    usePropSyncedState(selectedRecipeInput);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [recipes, setRecipes] = useState<RecipeSummaryLite[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const myProfileQuery = useOfflineFirstQuery(
    serverActions.users.getMe({
      401: () => {},
    }),
  );
  const myProfile = myProfileQuery.data;

  const friendsQuery = useActionQuery(["users.getMyFriends"], () =>
    serverActions.users.getMyFriends({
      401: () => {},
    }),
  );
  const friendsById = useMemo(() => {
    const friends = friendsQuery.data?.friends;
    if (!friends) return undefined;
    return new Map(friends.map((friend) => [friend.id, friend]));
  }, [friendsQuery.data]);

  useEffect(() => () => clearTimeout(searchTimeoutRef.current), []);

  const setSelectedRecipe = (recipe: RecipeSummary | undefined) => {
    setSelectedRecipeState(recipe);
    onSelectedRecipeChange?.(recipe);
  };

  const search = async (text: string) => {
    const loading = loadingService.start();

    const response = await serverActions.recipes.searchRecipes({
      searchTerm: text,
      folder: "main",
      includeAllFriends,
    });
    loading.dismiss();
    setSearching(false);

    if (!response) return;

    setRecipes(response.recipes);
  };

  const onSearchInputChange = (value: string) => {
    setSearchText(value);
    setRecipes([]);
    clearTimeout(searchTimeoutRef.current);
    if (!value) return;

    setSearching(true);

    searchTimeoutRef.current = setTimeout(() => {
      void search(value);
    }, PAUSE_BEFORE_SEARCH);
  };

  const selectRecipe = async (recipe: RecipeSummaryLite) => {
    setSearchText("");

    const response = await serverActions.recipes.getRecipe({
      id: recipe.id,
    });
    if (!response) return;

    if (enableSelectedState) {
      setSelectedRecipe(response);
    } else {
      onSelectedRecipeChange?.(response);
    }
  };

  if (selectedRecipe) {
    return (
      <button
        type="button"
        className="flex w-full items-center gap-4 rounded-xl px-4 py-2 text-start hover:bg-muted"
        onClick={() => setSelectedRecipe(undefined)}
      >
        <RecipeAvatar recipe={selectedRecipe} />
        <div className="min-w-0 flex-1">
          <div dir="auto" className="truncate text-base">
            {selectedRecipe.title}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("components.selectRecipe.change")}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div>
      <div className="p-2">
        <InputGroup className="h-10">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            dir="auto"
            autoComplete="off"
            maxLength={SEARCH_TERM_LENGTH_LIMIT}
            placeholder={t("components.selectRecipe.search")}
            value={searchText}
            onChange={(event) => onSearchInputChange(event.target.value)}
          />
        </InputGroup>
      </div>
      {searchText.length > 0 && (
        <div className="px-4">
          <div className="relative">
            <div className="absolute z-10 max-h-[300px] w-full overflow-y-auto rounded-xl bg-popover text-popover-foreground shadow-[1px_1px_7px_rgba(0,0,0,0.4)]">
              {recipes.map((recipe) => {
                const friendHandle = friendsById?.get(recipe.userId)?.handle;
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    className="flex w-full items-center gap-4 border-b px-4 py-2 text-start last:border-b-0 hover:bg-muted"
                    onClick={() => void selectRecipe(recipe)}
                  >
                    <RecipeAvatar recipe={recipe} />
                    <div className="min-w-0 flex-1">
                      <div dir="auto" className="truncate text-base">
                        {recipe.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("components.selectRecipe.select")}
                      </div>
                    </div>
                    {myProfile && myProfile.id !== recipe.userId && (
                      <Badge className="max-w-[40%] truncate">
                        {friendsById?.has(recipe.userId)
                          ? `@${friendHandle}`
                          : t("pages.home.recipe.fromSharedCollection")}
                      </Badge>
                    )}
                  </button>
                );
              })}
              {searching && (
                <div className="flex items-center gap-4 px-4 py-3">
                  <Spinner className="size-6" />
                  <span dir="auto" className="text-base">
                    {t("components.selectRecipe.searching", { searchText })}
                  </span>
                </div>
              )}
              {recipes.length === 0 && searchText.length > 0 && !searching && (
                <div className="flex items-center gap-4 px-4 py-3">
                  <FolderOpenIcon
                    className="size-6 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span dir="auto" className="text-base">
                    {t("components.selectRecipe.null", { searchText })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
