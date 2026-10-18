import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarIcon, XIcon } from "lucide-react";
import type { RecipeSummary } from "@recipesage/prisma";
import { MEAL_PLAN_ITEMS_NOTES_LENGTH_LIMIT } from "@recipesage/util/shared";
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
import { TextArea } from "../../../components/forms/TextArea";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { MealCalendar } from "../../../components/meal-calendar/MealCalendar";
import { SelectMeal } from "../../../components/select-meal/SelectMeal";
import { useOfflineFirstQuery } from "../../../hooks/useOfflineFirstQuery";
import { loadingService } from "../../../services/loadingService";
import { serverActions } from "../../../services/serverActions";
import { openNewMealPlanModal } from "../../meal-plan-components/new-meal-plan-modal/openNewMealPlanModal";

const LAST_USED_MEAL_PLAN_ID_VAR = "lastUsedMealPlanId";

export type AddRecipeToMealPlanRecipe = Pick<RecipeSummary, "id" | "title">;

export const AddRecipeToMealPlanModal = ({
  controls,
  recipe,
}: {
  controls: DialogControls<void>;
  recipe: AddRecipeToMealPlanRecipe;
}) => {
  const { t } = useTranslation();
  const mealPlanTriggerId = useId();
  const [chosenMealPlanId, setChosenMealPlanId] = useState<string>();
  const [lastUsedMealPlanId] = useState(() =>
    localStorage.getItem(LAST_USED_MEAL_PLAN_ID_VAR),
  );
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [meal, setMeal] = useState<string>();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const mealPlansQuery = useOfflineFirstQuery(
    serverActions.mealPlans.getMealPlans(),
  );

  const mealPlans = useMemo(
    () =>
      mealPlansQuery.data
        ? [...mealPlansQuery.data].sort((a, b) =>
            a.title.localeCompare(b.title),
          )
        : undefined,
    [mealPlansQuery.data],
  );

  const selectedMealPlan = (() => {
    if (!mealPlans) return undefined;
    const chosen = mealPlans.find(
      (mealPlan) => mealPlan.id === chosenMealPlanId,
    );
    if (chosen) return chosen;
    const lastUsed = mealPlans.find(
      (mealPlan) => mealPlan.id === lastUsedMealPlanId,
    );
    if (lastUsed) return lastUsed;
    if (mealPlans.length === 1) return mealPlans[0];
    return undefined;
  })();

  const mealPlanItemsQuery = useOfflineFirstQuery(
    serverActions.mealPlans.getMealPlanItems({
      mealPlanId: selectedMealPlan?.id ?? "",
    }),
    { enabled: !!selectedMealPlan },
  );
  const selectedMealPlanItems = selectedMealPlan
    ? mealPlanItemsQuery.data
    : undefined;

  const isFormValid = !!selectedMealPlan && !!selectedDays[0] && !!meal;

  const save = async () => {
    if (saving) return;
    if (!selectedMealPlan || !selectedDays[0] || !meal) return;

    setSaving(true);
    const loading = loadingService.start();

    localStorage.setItem(LAST_USED_MEAL_PLAN_ID_VAR, selectedMealPlan.id);

    const result = await serverActions.mealPlans.createMealPlanItems({
      mealPlanId: selectedMealPlan.id,
      items: selectedDays.map((scheduledDate) => ({
        title: recipe.title,
        recipeId: recipe.id,
        meal,
        notes,
        scheduledDate,
      })),
    });
    loading.dismiss();
    setSaving(false);

    if (result) controls.close();
  };

  const createMealPlan = async () => {
    const message = t("pages.addRecipeToMealPlanModal.newMealPlanSuccess");

    const data = await openNewMealPlanModal();
    if (!data || !data.success) return;
    const newId = data.id;

    const refreshed = await mealPlansQuery.refetch();
    const refreshedMealPlans = refreshed.data;
    if (!refreshedMealPlans) return;
    const newMealPlan = refreshedMealPlans.find(
      (mealPlan) => mealPlan.id === newId,
    );
    if (!newMealPlan) return;

    if (refreshedMealPlans.length === 1) {
      setChosenMealPlanId(newMealPlan.id);
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
        start={null}
        title={t("pages.addRecipeToMealPlanModal.title")}
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
        {!selectedMealPlan && (
          <p>{t("pages.addRecipeToMealPlanModal.instructions1")}</p>
        )}
        {!mealPlans && <p>{t("pages.addRecipeToMealPlanModal.loading")}</p>}
        {mealPlans && mealPlans.length > 0 && (
          <Field>
            <FieldLabel htmlFor={mealPlanTriggerId}>
              {t("pages.addRecipeToMealPlanModal.selectDestination")}
            </FieldLabel>
            <Select
              value={selectedMealPlan?.id ?? null}
              items={mealPlans.map((mealPlan) => ({
                value: mealPlan.id,
                label: mealPlan.title,
              }))}
              onValueChange={(value) => {
                if (typeof value === "string") setChosenMealPlanId(value);
              }}
            >
              <SelectTrigger id={mealPlanTriggerId} className="h-10 w-full">
                <SelectValue dir="auto" />
              </SelectTrigger>
              <SelectContent>
                {mealPlans.map((mealPlan) => (
                  <SelectItem key={mealPlan.id} value={mealPlan.id}>
                    <span dir="auto">{mealPlan.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {mealPlans && mealPlans.length === 0 && (
          <div className="flex flex-col items-start gap-6">
            <p>{t("pages.addRecipeToMealPlanModal.noMealPlans")}</p>
            <Button size="lg" onClick={() => void createMealPlan()}>
              <CalendarIcon data-icon="inline-start" />
              {t("pages.addRecipeToMealPlanModal.createMealPlan")}
            </Button>
          </div>
        )}
        {selectedMealPlan && selectedMealPlanItems && (
          <>
            <MealCalendar
              key={selectedMealPlan.id}
              mealPlanItems={selectedMealPlanItems}
              customMealOptions={selectedMealPlan.customMealOptions}
              onSelectedDaysChange={setSelectedDays}
            />
            <TextArea
              label={t("pages.newMealPlanItemModal.notes")}
              value={notes}
              onValueChange={setNotes}
              autoGrow
              rows={2}
              maxLength={MEAL_PLAN_ITEMS_NOTES_LENGTH_LIMIT}
            />
          </>
        )}
      </PageContent>
      <PageFooter className="flex flex-col gap-3 p-4">
        <SelectMeal
          customMealOptions={selectedMealPlan?.customMealOptions ?? null}
          onMealChange={setMeal}
        />
        <Button
          size="lg"
          className="w-full"
          disabled={!isFormValid}
          onClick={() => void save()}
        >
          <CalendarIcon data-icon="inline-start" />
          {isFormValid && (
            <span>{t("pages.addRecipeToMealPlanModal.add")}</span>
          )}
          {!selectedMealPlan && (
            <span>{t("pages.addRecipeToMealPlanModal.selectMealPlan")}</span>
          )}
          {selectedMealPlan && (!selectedDays[0] || !meal) && (
            <span>{t("pages.addRecipeToMealPlanModal.selectMeal")}</span>
          )}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
