import { useTranslation } from "react-i18next";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyWithWebshare } from "../../../components/copy-with-webshare/CopyWithWebshare";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { serverConfig } from "../../../utils/serverConfig";

export const ICalMealPlanModal = ({
  controls,
  mealPlanId,
}: {
  controls: DialogControls<void>;
  mealPlanId: string;
}) => {
  const { t } = useTranslation();

  const icalURL = `${serverConfig.apiBase}mealPlans/${mealPlanId}/ical`;

  const close = () => {
    controls.close();
  };

  return (
    <ModalDialog controls={controls}>
      <PageHeader start={null} title={t("pages.icalMealPlanModal.title")} />
      <PageContent className="flex flex-col gap-4 pt-8">
        <p>{t("pages.icalMealPlanModal.description")}</p>

        <CopyWithWebshare webshareURL={icalURL} copyText={icalURL} />
      </PageContent>
      <PageFooter className="p-4">
        <Button size="lg" className="w-full" onClick={close}>
          <XIcon data-icon="inline-start" />
          {t("generic.close")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
