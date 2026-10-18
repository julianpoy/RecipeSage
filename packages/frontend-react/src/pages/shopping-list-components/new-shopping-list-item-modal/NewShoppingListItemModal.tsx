import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ListIcon, XIcon } from "lucide-react";
import type { RecipeSummary } from "@recipesage/prisma";
import {
  MyRecipesIncludeFriendsOptions,
  MyRecipesPreferenceKey,
  SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT,
  type ParsedIngredient,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { TextArea } from "../../../components/forms/TextArea";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { SelectIngredients } from "../../../components/select-ingredients/SelectIngredients";
import { SelectRecipe } from "../../../components/select-recipe/SelectRecipe";
import { preferencesStore } from "../../../stores/preferencesStore";

export interface NewShoppingListItemDraft {
  title: string;
  completed: boolean;
  recipeId: string | null;
}

export interface NewShoppingListItemModalResult {
  items: NewShoppingListItemDraft[];
}

type InputType = "items" | "recipe";

const isInputType = (value: unknown): value is InputType =>
  value === "items" || value === "recipe";

const titleMaxLength = SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT;

export const NewShoppingListItemModal = ({
  controls,
}: {
  controls: DialogControls<NewShoppingListItemModalResult>;
}) => {
  const { t } = useTranslation();
  const includeFriendsPreference = preferencesStore(
    (state) => state.preferences[MyRecipesPreferenceKey.IncludeFriends],
  );
  const includeAllFriends =
    includeFriendsPreference === MyRecipesIncludeFriendsOptions.Yes ||
    includeFriendsPreference === MyRecipesIncludeFriendsOptions.Search;

  const [inputType, setInputType] = useState<InputType>("items");
  const [itemsText, setItemsText] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSummary>();
  const [selectedIngredients, setSelectedIngredients] = useState<
    ParsedIngredient[]
  >([]);

  const parseItemTitles = () =>
    itemsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

  const isFormValid = () => {
    if (inputType === "recipe" && selectedRecipe && selectedRecipe.id) {
      return selectedIngredients.length > 0;
    }
    if (inputType === "items") {
      return parseItemTitles().length > 0;
    }
    return false;
  };

  const save = () => {
    let items: NewShoppingListItemDraft[];
    if (inputType === "recipe") {
      if (!selectedRecipe) return;

      items = selectedIngredients.map((ingredient) => ({
        title: ingredient.plaintextContent.slice(0, titleMaxLength),
        completed: false,
        recipeId: selectedRecipe.id || null,
      }));
    } else {
      items = parseItemTitles().map((title) => ({
        title: title.slice(0, titleMaxLength),
        completed: false,
        recipeId: null,
      }));
    }

    controls.close({
      items,
    });
  };

  const cancel = () => {
    controls.close();
  };

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={null}
        title={t("pages.newShoppingListItem.title")}
        end={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit"
            aria-label={t("generic.close")}
            onClick={cancel}
          >
            <XIcon className="size-6" />
          </Button>
        }
      />
      <PageContent className="flex flex-col gap-4">
        <Tabs
          value={inputType}
          onValueChange={(value) => {
            if (isInputType(value)) setInputType(value);
          }}
        >
          <TabsList className="w-full group-data-horizontal/tabs:h-10">
            <TabsTrigger value="items">
              {t("pages.newShoppingListItem.items")}
            </TabsTrigger>
            <TabsTrigger value="recipe">
              {t("pages.newShoppingListItem.recipe")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {inputType === "items" && (
          <TextArea
            label={t("pages.newShoppingListItem.itemsLabel")}
            helperText={t("pages.newShoppingListItem.itemsHelper")}
            value={itemsText}
            onValueChange={setItemsText}
            rows={5}
            autoGrow
            autoCapitalize="on"
            autoCorrect="on"
            spellCheck
          />
        )}

        {inputType === "recipe" && (
          <div>
            <SelectRecipe
              selectedRecipe={selectedRecipe}
              onSelectedRecipeChange={setSelectedRecipe}
              includeAllFriends={includeAllFriends}
            />
            {selectedRecipe && (
              <SelectIngredients
                ingredients={selectedRecipe.ingredients}
                onSelectedIngredientsChange={setSelectedIngredients}
              />
            )}
          </div>
        )}
      </PageContent>
      <PageFooter className="p-4">
        <Button
          size="lg"
          className="w-full"
          disabled={!isFormValid()}
          onClick={save}
        >
          <ListIcon data-icon="inline-start" />
          {t("pages.newShoppingListItem.add")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
