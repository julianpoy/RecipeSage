import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ListIcon, XIcon } from "lucide-react";
import type { RecipeSummary } from "@recipesage/prisma";
import {
  SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT,
  type ParsedIngredient,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { showToast } from "../../../components/dialogs/showToast";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { SelectIngredients } from "../../../components/select-ingredients/SelectIngredients";
import { useOfflineFirstQuery } from "../../../hooks/useOfflineFirstQuery";
import type { UnitSystem } from "../../../modals/scale-recipe/ScaleRecipe";
import { loadingService } from "../../../services/loadingService";
import { serverActions } from "../../../services/serverActions";
import { openNewShoppingListModal } from "../../shopping-list-components/new-shopping-list-modal/openNewShoppingListModal";

const LAST_USED_SHOPPING_LIST_ID_VAR = "lastUsedShoppingListId";

export type AddRecipeToShoppingListRecipe = Pick<
  RecipeSummary,
  "id" | "title" | "ingredients"
>;

export const AddRecipeToShoppingListModal = ({
  controls,
  recipes,
  scale = "1",
  unitSystem = "original",
}: {
  controls: DialogControls<void>;
  recipes: AddRecipeToShoppingListRecipe[];
  scale?: string;
  unitSystem?: UnitSystem;
}) => {
  const { t } = useTranslation();
  const destinationTriggerId = useId();
  const [saving, setSaving] = useState(false);
  const [chosenDestinationId, setChosenDestinationId] = useState<string>();
  const [lastUsedShoppingListId] = useState(() =>
    localStorage.getItem(LAST_USED_SHOPPING_LIST_ID_VAR),
  );
  const [selectedIngredientsByRecipe, setSelectedIngredientsByRecipe] =
    useState<Record<string, ParsedIngredient[]>>({});

  const shoppingListsQuery = useOfflineFirstQuery(
    serverActions.shoppingLists.getShoppingLists(),
  );

  const shoppingLists = useMemo(
    () =>
      shoppingListsQuery.data
        ? [...shoppingListsQuery.data].sort((a, b) =>
            a.title.localeCompare(b.title),
          )
        : undefined,
    [shoppingListsQuery.data],
  );

  const destinationShoppingList = shoppingLists?.find((list) =>
    chosenDestinationId === undefined
      ? list.id === lastUsedShoppingListId
      : list.id === chosenDestinationId,
  );

  const selectedIngredients = Object.values(selectedIngredientsByRecipe).flat();

  const isFormValid =
    !!destinationShoppingList && selectedIngredients.length > 0;

  const onSelectedIngredientsChange = (
    recipeId: string,
    ingredients: ParsedIngredient[],
  ) => {
    setSelectedIngredientsByRecipe((prev) => ({
      ...prev,
      [recipeId]: ingredients,
    }));
  };

  const save = async () => {
    if (saving) return;
    if (!destinationShoppingList) return;

    setSaving(true);
    const loading = loadingService.start();

    localStorage.setItem(
      LAST_USED_SHOPPING_LIST_ID_VAR,
      destinationShoppingList.id,
    );

    const items = Object.entries(selectedIngredientsByRecipe)
      .map(([recipeId, ingredients]) =>
        ingredients.map((ingredient) => ({
          title: ingredient.plaintextContent
            .trim()
            .slice(0, SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT),
          recipeId,
        })),
      )
      .flat()
      .filter((item) => item.title.length > 0);

    if (items.length === 0) {
      setSaving(false);
      loading.dismiss();
      controls.close();
      return;
    }

    const response = await serverActions.shoppingLists.createShoppingListItems({
      shoppingListId: destinationShoppingList.id,
      items,
    });

    setSaving(false);
    loading.dismiss();
    if (!response) return;

    controls.close();
  };

  const createShoppingList = async () => {
    const message = t("pages.addRecipeToShoppingListModal.newListSuccess");

    const data = await openNewShoppingListModal({
      openAfterCreate: false,
    });
    if (!data || !data.success) return;
    const newId = data.id;

    const refreshed = await shoppingListsQuery.refetch();
    const lists = refreshed.data;
    if (!lists) return;
    const newList = lists.find((list) => list.id === newId);
    if (!newList) return;

    if (lists.length === 1) {
      setChosenDestinationId(newList.id);
    } else {
      showToast({
        message,
        duration: 6000,
      });
    }
  };

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={<></>}
        title={
          recipes.length > 1
            ? t("pages.addRecipeToShoppingListModal.title.plural")
            : t("pages.addRecipeToShoppingListModal.title.singular")
        }
        end={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit"
            aria-label={t("generic.close")}
            onClick={() => controls.close()}
          >
            <XIcon className="size-6" />
          </Button>
        }
      />
      <PageContent className="flex flex-col gap-4">
        <p>{t("pages.addRecipeToShoppingListModal.selectDestination")}</p>

        {!shoppingLists && (
          <p>{t("pages.addRecipeToShoppingListModal.loading")}</p>
        )}
        {shoppingLists && shoppingLists.length > 0 && (
          <Field>
            <FieldLabel htmlFor={destinationTriggerId}>
              {t("pages.addRecipeToShoppingListModal.destination")}
            </FieldLabel>
            <Select
              value={destinationShoppingList?.id ?? null}
              items={shoppingLists.map((list) => ({
                value: list.id,
                label: list.title,
              }))}
              onValueChange={(value) => {
                if (typeof value === "string") setChosenDestinationId(value);
              }}
            >
              <SelectTrigger id={destinationTriggerId} className="h-10 w-full">
                <SelectValue dir="auto" />
              </SelectTrigger>
              <SelectContent>
                {shoppingLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    <span dir="auto">{list.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {shoppingLists && shoppingLists.length === 0 && (
          <div className="flex flex-col items-start gap-6">
            <p>{t("pages.addRecipeToShoppingListModal.noShoppingLists")}</p>
            <Button size="lg" onClick={() => void createShoppingList()}>
              <ListIcon data-icon="inline-start" />
              {t("pages.addRecipeToShoppingListModal.createShoppingList")}
            </Button>
          </div>
        )}

        {recipes.map((recipe) => (
          <div key={recipe.id} className="mt-4 mb-8">
            {recipes.length > 1 && (
              <div dir="auto" className="mb-2 font-bold">
                {recipe.title}
              </div>
            )}
            <SelectIngredients
              ingredients={recipe.ingredients}
              initialScale={scale}
              initialUnitSystem={unitSystem}
              onSelectedIngredientsChange={(ingredients) =>
                onSelectedIngredientsChange(recipe.id, ingredients)
              }
            />
          </div>
        ))}
      </PageContent>
      <PageFooter className="p-4">
        <Button
          size="lg"
          className="w-full"
          disabled={!isFormValid}
          onClick={() => void save()}
        >
          <ListIcon data-icon="inline-start" />
          {t("pages.addRecipeToShoppingListModal.add")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
