import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRightIcon, ListIcon, MenuIcon, XIcon } from "lucide-react";
import type { MealPlanSummary } from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { TextField } from "../../../components/forms/TextField";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { SelectCollaborators } from "../../../components/select-collaborators/SelectCollaborators";
import { loadingService } from "../../../services/loadingService";
import { serverActions } from "../../../services/serverActions";
import { openMealPlanMealOrderModal } from "../meal-plan-meal-order-modal/openMealPlanMealOrderModal";

export interface UpdateMealPlanModalResult {
  success: boolean;
}

export type UpdateMealPlanModalMealPlan = Pick<
  MealPlanSummary,
  "id" | "title" | "customMealOptions" | "collaboratorUsers"
>;

export const UpdateMealPlanModal = ({
  controls,
  mealPlan,
}: {
  controls: DialogControls<UpdateMealPlanModalResult>;
  mealPlan: UpdateMealPlanModalMealPlan;
}) => {
  const { t } = useTranslation();
  const [mealPlanTitle, setMealPlanTitle] = useState(mealPlan.title);
  const [saving, setSaving] = useState(false);
  const [customMealOptions, setCustomMealOptions] = useState(
    mealPlan.customMealOptions,
  );
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState(() =>
    mealPlan.collaboratorUsers.map(
      (collaboratorUser) => collaboratorUser.user.id,
    ),
  );

  const openCustomMealOptions = async () => {
    const data = await openMealPlanMealOrderModal({
      customMealOptions: customMealOptions || undefined,
    });

    if (data?.customMealOptions !== undefined) {
      setCustomMealOptions(data.customMealOptions || null);
    }
  };

  const save = async () => {
    if (saving) return;

    setSaving(true);
    const loading = loadingService.start();

    const result = await serverActions.mealPlans.updateMealPlan({
      id: mealPlan.id,
      title: mealPlanTitle,
      collaboratorUserIds: selectedCollaboratorIds,
      customMealOptions,
    });
    loading.dismiss();
    setSaving(false);
    if (!result) return;

    controls.close({
      success: true,
    });
  };

  const cancel = () => {
    controls.close({
      success: false,
    });
  };

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={null}
        title={t("pages.updateMealPlanModal.title")}
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
        <h2 className="text-base font-medium">
          {t("pages.updateMealPlanModal.detailsTitle")}
        </h2>
        <TextField
          label={t("pages.updateMealPlanModal.input.title")}
          value={mealPlanTitle}
          onValueChange={setMealPlanTitle}
          type="text"
          autoCapitalize="on"
          autoComplete="on"
          autoCorrect="on"
          spellCheck
        />
        <button
          type="button"
          className="flex min-h-12 w-full items-center gap-4 rounded-xl px-4 py-2 text-start hover:bg-muted"
          onClick={() => void openCustomMealOptions()}
        >
          <MenuIcon
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            {t("pages.updateMealPlanModal.customizeMealOptions")}
          </span>
          <ChevronRightIcon
            className="size-5 shrink-0 text-muted-foreground rtl:rotate-180"
            aria-hidden="true"
          />
        </button>

        <SelectCollaborators
          selectedCollaboratorIds={selectedCollaboratorIds}
          onSelectedCollaboratorIdsChanged={setSelectedCollaboratorIds}
        />
      </PageContent>
      <PageFooter className="p-4">
        <Button
          size="lg"
          className="w-full"
          disabled={!mealPlanTitle}
          onClick={() => void save()}
        >
          <ListIcon data-icon="inline-start" />
          {selectedCollaboratorIds.length > 0
            ? t("pages.updateMealPlanModal.updateAndShare")
            : t("pages.updateMealPlanModal.update")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
