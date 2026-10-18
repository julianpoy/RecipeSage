import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { CalendarIcon, XIcon } from "lucide-react";
import type { RecipeSummary } from "@recipesage/prisma";
import {
  MEAL_PLAN_ITEMS_NOTES_LENGTH_LIMIT,
  MEAL_PLAN_ITEMS_TITLE_LENGTH_LIMIT,
  MyRecipesIncludeFriendsOptions,
  MyRecipesPreferenceKey,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CachedImage } from "../../../components/CachedImage";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { TextArea } from "../../../components/forms/TextArea";
import { TextField } from "../../../components/forms/TextField";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { RecurrenceEditor } from "../../../components/recurrence-editor/RecurrenceEditor";
import { expandRecurrence } from "../../../components/recurrence-editor/util/expandRecurrence";
import type { RecurrenceRule } from "../../../components/recurrence-editor/util/recurrenceRule";
import { SelectMeal } from "../../../components/select-meal/SelectMeal";
import { SelectRecipe } from "../../../components/select-recipe/SelectRecipe";
import { preferencesStore } from "../../../stores/preferencesStore";

const DATE_STAMP_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface MealPlanItemDraft {
  title: string;
  recipeId: string | null;
  meal: string;
  notes: string;
  scheduledDate: string;
}

export interface NewMealPlanItemModalResult {
  items: MealPlanItemDraft[];
}

export type NewMealPlanItemInputType = "recipe" | "manualEntry";

export type NewMealPlanItemRecipe = Pick<RecipeSummary, "id" | "title"> & {
  recipeImages: { image: { location: string } }[];
};

export interface NewMealPlanItemModalProps {
  isEditing?: boolean;
  inputType?: NewMealPlanItemInputType;
  recipe?: NewMealPlanItemRecipe | null;
  title?: string;
  meal?: string;
  notes?: string;
  customMealOptions?: string | null;
  scheduledDate?: string;
}

const isInputType = (value: unknown): value is NewMealPlanItemInputType =>
  value === "recipe" || value === "manualEntry";

export const NewMealPlanItemModal = ({
  controls,
  isEditing = false,
  inputType: initialInputType = "recipe",
  recipe: initialRecipeInput,
  title: initialTitle = "",
  meal: initialMeal,
  notes: initialNotes = "",
  customMealOptions = null,
  scheduledDate: initialScheduledDate,
}: NewMealPlanItemModalProps & {
  controls: DialogControls<NewMealPlanItemModalResult>;
}) => {
  const { t } = useTranslation();
  const dateInputId = useId();
  const includeFriendsPreference = preferencesStore(
    (state) => state.preferences[MyRecipesPreferenceKey.IncludeFriends],
  );
  const includeAllFriends =
    includeFriendsPreference === MyRecipesIncludeFriendsOptions.Yes ||
    includeFriendsPreference === MyRecipesIncludeFriendsOptions.Search;

  const [inputType, setInputType] =
    useState<NewMealPlanItemInputType>(initialInputType);
  const [initialRecipe, setInitialRecipe] = useState(
    initialRecipeInput || undefined,
  );
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSummary>();
  const [title, setTitle] = useState(initialTitle);
  const [meal, setMeal] = useState(initialMeal);
  const [notes, setNotes] = useState(initialNotes);
  const [scheduledDate, setScheduledDate] = useState(
    () => initialScheduledDate ?? dayjs().format("YYYY-MM-DD"),
  );
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  const [isRecurrenceValid, setIsRecurrenceValid] = useState(true);

  const recipe: NewMealPlanItemRecipe | undefined =
    selectedRecipe ?? initialRecipe;

  const isFormValid = () => {
    if (!DATE_STAMP_REGEX.test(scheduledDate)) return false;

    if (!isEditing && !isRecurrenceValid) return false;

    if (inputType === "recipe" && !recipe) return false;

    if (inputType === "manualEntry" && (!title || title.length === 0))
      return false;

    if (!meal) return false;

    return true;
  };

  const save = () => {
    if (!meal || !isFormValid()) return;

    const baseItem: MealPlanItemDraft = {
      title: inputType === "recipe" && recipe ? recipe.title : title,
      recipeId: inputType === "recipe" && recipe ? recipe.id : null,
      meal,
      notes,
      scheduledDate,
    };

    const activeRecurrence = isEditing ? null : recurrence;
    const items: MealPlanItemDraft[] = activeRecurrence
      ? expandRecurrence(scheduledDate, activeRecurrence).dates.map((date) => ({
          ...baseItem,
          scheduledDate: date,
        }))
      : [baseItem];

    controls.close({ items });
  };

  const cancel = () => {
    controls.close();
  };

  const initialRecipeImage = initialRecipe?.recipeImages.at(0)?.image.location;

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={null}
        title={
          isEditing
            ? t("pages.newMealPlanItemModal.title.update")
            : t("pages.newMealPlanItemModal.title.new")
        }
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
      <PageContent className="flex flex-col gap-8">
        <div className="flex flex-col gap-6">
          <Tabs
            value={inputType}
            onValueChange={(value) => {
              if (isInputType(value)) setInputType(value);
            }}
          >
            <TabsList className="w-full group-data-horizontal/tabs:h-10">
              <TabsTrigger value="recipe">
                {t("pages.newMealPlanItemModal.inputType.recipe")}
              </TabsTrigger>
              <TabsTrigger value="manualEntry">
                {t("pages.newMealPlanItemModal.inputType.manual")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {inputType === "manualEntry" && (
            <TextField
              label={t("pages.newMealPlanItemModal.itemTitle")}
              value={title}
              onValueChange={setTitle}
              type="text"
              autoCapitalize="on"
              autoComplete="on"
              autoCorrect="on"
              spellCheck
              maxLength={MEAL_PLAN_ITEMS_TITLE_LENGTH_LIMIT}
            />
          )}

          {inputType === "recipe" &&
            (initialRecipe && !selectedRecipe ? (
              <button
                type="button"
                className="flex w-full items-center gap-4 rounded-xl px-4 py-2 text-start hover:bg-muted"
                onClick={() => setInitialRecipe(undefined)}
              >
                {initialRecipeImage ? (
                  <CachedImage
                    src={initialRecipeImage}
                    className="size-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <img
                    src="assets/imgs/logo_green_padded.png"
                    alt=""
                    className="size-10 shrink-0 rounded-full object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div dir="auto" className="truncate text-base">
                    {initialRecipe.title}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("components.selectRecipe.change")}
                  </div>
                </div>
              </button>
            ) : (
              <SelectRecipe
                selectedRecipe={selectedRecipe}
                onSelectedRecipeChange={setSelectedRecipe}
                includeAllFriends={includeAllFriends}
              />
            ))}
        </div>

        <Field>
          <FieldLabel htmlFor={dateInputId}>
            {t("pages.newMealPlanItemModal.date")}
          </FieldLabel>
          <Input
            id={dateInputId}
            type="date"
            className="h-10"
            value={scheduledDate}
            onChange={(event) => {
              const value = event.target.value;
              setScheduledDate(DATE_STAMP_REGEX.test(value) ? value : "");
            }}
          />
        </Field>

        {!isEditing && (
          <RecurrenceEditor
            baseDate={scheduledDate || undefined}
            onRuleChange={setRecurrence}
            onRuleValidChange={setIsRecurrenceValid}
          />
        )}

        <SelectMeal
          meal={meal || ""}
          customMealOptions={customMealOptions}
          onMealChange={setMeal}
        />

        <TextArea
          label={t("pages.newMealPlanItemModal.notes")}
          value={notes}
          onValueChange={setNotes}
          rows={3}
          autoGrow
          maxLength={MEAL_PLAN_ITEMS_NOTES_LENGTH_LIMIT}
        />
      </PageContent>
      <PageFooter className="p-4">
        <Button
          size="lg"
          className="w-full"
          disabled={!isFormValid()}
          onClick={save}
        >
          <CalendarIcon data-icon="inline-start" />
          {isEditing
            ? t("pages.newMealPlanItemModal.save")
            : t("pages.newMealPlanItemModal.create")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
