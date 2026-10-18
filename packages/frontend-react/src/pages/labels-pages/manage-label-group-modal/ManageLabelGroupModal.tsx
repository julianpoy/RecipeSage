import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TagIcon, XIcon } from "lucide-react";
import type { LabelGroupSummary, LabelSummary } from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { showAlert } from "../../../components/dialogs/showAlert";
import { TextField } from "../../../components/forms/TextField";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  SelectMultipleItems,
  type SelectableItem,
} from "../../../components/select-multiple-items/SelectMultipleItems";
import { useActionQuery } from "../../../hooks/useActionQuery";
import { loadingService } from "../../../services/loadingService";
import { serverActions } from "../../../services/serverActions";

const mapLabelsToSelectableItems = (labels: LabelSummary[]) =>
  labels.map(
    (label): SelectableItem => ({
      id: label.id,
      title: label.title,
      icon: <TagIcon />,
    }),
  );

export const ManageLabelGroupModal = ({
  controls,
  labelGroup,
}: {
  controls: DialogControls<void>;
  labelGroup: LabelGroupSummary;
}) => {
  const { t } = useTranslation();

  const [title, setTitle] = useState(labelGroup.title);
  const [warnWhenNotPresent, setWarnWhenNotPresent] = useState(
    labelGroup.warnWhenNotPresent,
  );
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>();

  const labelsQuery = useActionQuery(["labels.getLabels"], () =>
    serverActions.labels.getLabels(),
  );

  const labels = useMemo(
    () =>
      labelsQuery.data
        ? [...labelsQuery.data].sort((a, b) => a.title.localeCompare(b.title))
        : [],
    [labelsQuery.data],
  );
  const ungroupedItems = useMemo(
    () =>
      mapLabelsToSelectableItems(labels.filter((label) => !label.labelGroupId)),
    [labels],
  );

  const selectedLabels = useMemo(() => {
    if (selectedLabelIds) {
      return selectedLabelIds
        .map((labelId) => labels.find((label) => label.id === labelId))
        .filter((label): label is LabelSummary => !!label);
    }
    return labels.filter((label) => label.labelGroupId === labelGroup.id);
  }, [selectedLabelIds, labels, labelGroup.id]);
  const selectedItems = useMemo(
    () => mapLabelsToSelectableItems(selectedLabels),
    [selectedLabels],
  );

  const cancel = () => {
    controls.close();
  };

  const selectedLabelsChange = (items: SelectableItem[]) => {
    setSelectedLabelIds(items.map((item) => item.id));
  };

  const save = async () => {
    if (!title) return;

    const loading = loadingService.start();
    const result = await serverActions.labelGroups.updateLabelGroup(
      {
        id: labelGroup.id,
        title,
        labelIds: selectedLabels.map((selectedLabel) => selectedLabel.id),
        warnWhenNotPresent,
      },
      {
        409: () => {
          void showAlert({
            header: t("pages.manageLabelGroupModal.conflict"),
            message: t("pages.manageLabelGroupModal.conflictMessage"),
            buttons: [
              {
                text: t("generic.okay"),
                role: "cancel",
              },
            ],
          });
        },
      },
    );
    loading.dismiss();
    if (result) {
      cancel();
    }
  };

  const _delete = async () => {
    const loading = loadingService.start();
    await serverActions.labelGroups.deleteLabelGroup({
      id: labelGroup.id,
    });
    loading.dismiss();

    cancel();
  };

  const deleteLabelGroup = async () => {
    await showAlert({
      header: t("pages.manageLabelGroupModal.delete.header"),
      message: t("pages.manageLabelGroupModal.delete.message", {
        title: labelGroup.title,
      }),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
        },
        {
          text: t("generic.delete"),
          variant: "destructive",
          handler: () => {
            void _delete();
          },
        },
      ],
    });
  };

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={null}
        title={t("pages.manageLabelGroupModal.title")}
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
        <TextField
          label={t("pages.manageLabelGroupModal.groupTitle")}
          placeholder={t("pages.manageLabelGroupModal.groupTitlePlaceholder")}
          helperText={t("pages.manageLabelGroupModal.groupTitleHint")}
          value={title}
          onValueChange={setTitle}
        />
        <Label className="mt-8 items-start justify-between gap-4 px-1 text-base leading-snug font-normal">
          <span className="min-w-0">
            <span className="block">
              {t("pages.manageLabelGroupModal.warn")}
            </span>
            <span className="block text-sm text-muted-foreground">
              {t("pages.manageLabelGroupModal.warnDescription")}
            </span>
          </span>
          <Switch
            checked={warnWhenNotPresent}
            onCheckedChange={setWarnWhenNotPresent}
          />
        </Label>
        <div className="px-1">
          <div className="text-base">
            {t("pages.manageLabelGroupModal.labels")}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("pages.manageLabelGroupModal.labelsHint")}
          </p>
        </div>
        <SelectMultipleItems
          selectedItems={selectedItems}
          items={ungroupedItems}
          onSelectedItemsChange={selectedLabelsChange}
          noSelectedItemsText={t(
            "pages.manageLabelGroupModal.labels.noSelectedItems",
          )}
          noItemsText={t("pages.manageLabelGroupModal.labels.noItems")}
          searchPlaceholderText={t("pages.manageLabelGroupModal.labels.search")}
        />
      </PageContent>
      <PageFooter className="flex flex-col gap-2 p-4">
        <Button
          size="lg"
          className="w-full"
          disabled={!title.length}
          onClick={() => void save()}
        >
          {t("generic.save")}
        </Button>
        <Button
          size="lg"
          variant="destructive"
          className="w-full"
          onClick={() => void deleteLabelGroup()}
        >
          {t("generic.delete")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
