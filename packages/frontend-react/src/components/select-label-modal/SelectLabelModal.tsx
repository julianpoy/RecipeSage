import { useTranslation } from "react-i18next";
import { XIcon } from "lucide-react";
import type { LabelSummary } from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { ModalDialog } from "../dialogs/ModalDialog";
import type { DialogControls } from "../dialogs/openDialog";
import { PageContent } from "../layout/PageContent";
import { PageHeader } from "../layout/PageHeader";
import { SelectLabel } from "../select-label/SelectLabel";

export const SelectLabelModal = ({
  controls,
}: {
  controls: DialogControls<LabelSummary>;
}) => {
  const { t } = useTranslation();

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={<></>}
        title={t("components.selectLabelModal.title")}
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
      <PageContent>
        <SelectLabel
          onSelectedLabelChange={(label) => {
            if (label) controls.close(label);
          }}
        />
      </PageContent>
    </ModalDialog>
  );
};
