import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon, TagIcon, TagsIcon, XIcon } from "lucide-react";
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

const headerButtonClassName =
  "text-inherit hover:bg-white/10 hover:text-inherit";

const mapLabelsToSelectableItems = (labels: LabelSummary[]) =>
  labels.map(
    (label): SelectableItem => ({
      id: label.id,
      title: label.title,
      icon: <TagIcon />,
    }),
  );

export const NewLabelItemModal = ({
  controls,
  labelGroup,
}: {
  controls: DialogControls<void>;
  labelGroup?: LabelGroupSummary;
}) => {
  const { t } = useTranslation();

  const [type, setType] = useState<"label" | "group" | null>(
    labelGroup ? "group" : null,
  );
  const [title, setTitle] = useState(labelGroup?.title || "");
  const [warnWhenNotPresent, setWarnWhenNotPresent] = useState(false);
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
  const ungroupedLabels = useMemo(
    () => labels.filter((label) => !label.labelGroupId),
    [labels],
  );
  const ungroupedItems = useMemo(
    () => mapLabelsToSelectableItems(ungroupedLabels),
    [ungroupedLabels],
  );

  const selectedLabels = useMemo(() => {
    if (selectedLabelIds) {
      return selectedLabelIds
        .map((labelId) => labels.find((label) => label.id === labelId))
        .filter((label): label is LabelSummary => !!label);
    }
    if (!labelGroup) return [];
    return labels.filter((label) => label.labelGroupId === labelGroup.id);
  }, [selectedLabelIds, labels, labelGroup]);

  const cancel = () => {
    controls.close();
  };

  const selectedLabelsChange = (selectedItems: SelectableItem[]) => {
    setSelectedLabelIds(selectedItems.map((selectedItem) => selectedItem.id));
  };

  const saveLabel = async () => {
    if (!title) return;

    const loading = loadingService.start();
    await serverActions.labels.createLabel(
      {
        title,
        labelGroupId: null,
      },
      {
        400: () => {
          void showAlert({
            header: t("generic.error"),
            message: t("pages.newLabelItemModal.badLabelMessage"),
            buttons: [{ text: t("generic.okay") }],
          });
        },
        409: () => {
          void showAlert({
            header: t("generic.error"),
            message: t("pages.newLabelItemModal.existingConflict"),
            buttons: [{ text: t("generic.okay") }],
          });
        },
      },
    );
    loading.dismiss();

    cancel();
  };

  const _saveLabelGroup = async () => {
    if (!title) return;

    const loading = loadingService.start();
    const result = await serverActions.labelGroups.createLabelGroup(
      {
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

  const saveLabelGroup = async () => {
    if (!title) return;

    if (!selectedLabels.length) {
      await showAlert({
        header: t("pages.manageLabelGroupModal.noLabelsSelected"),
        message: t("pages.manageLabelGroupModal.noLabelsSelectedMessage"),
        buttons: [
          {
            text: t("generic.ignore"),
            handler: () => {
              void _saveLabelGroup();
            },
          },
          {
            text: t("generic.cancel"),
            role: "cancel",
          },
        ],
      });

      return;
    }

    return _saveLabelGroup();
  };

  const save = () => {
    if (type === "label") {
      void saveLabel();
    }
    if (type === "group") {
      void saveLabelGroup();
    }
  };

  let headerTitle = t("pages.newLabelItemModal.title");
  if (type === "group")
    headerTitle = t("pages.newLabelItemModal.categoryTitle");
  if (type === "label") headerTitle = t("pages.newLabelItemModal.labelTitle");

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={
          type ? (
            <Button
              variant="ghost"
              size="icon-lg"
              className={headerButtonClassName}
              aria-label={t("generic.back")}
              onClick={() => setType(null)}
            >
              <ArrowLeftIcon className="size-6 rtl:rotate-180" />
            </Button>
          ) : null
        }
        title={headerTitle}
        end={
          <Button
            variant="ghost"
            size="icon-lg"
            className={headerButtonClassName}
            aria-label={t("generic.close")}
            onClick={cancel}
          >
            <XIcon className="size-6" />
          </Button>
        }
      />
      {!type && (
        <PageContent className="flex flex-col">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-6 border-b px-4 py-3 text-start outline-none hover:bg-muted focus-visible:bg-muted"
            onClick={() => setType("label")}
          >
            <TagIcon className="size-6 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-base">
                {t("pages.newLabelItemModal.label")}
              </span>
              <span className="block text-sm text-muted-foreground">
                {t("pages.newLabelItemModal.labelDescription")}
              </span>
            </span>
          </button>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-6 border-b px-4 py-3 text-start outline-none hover:bg-muted focus-visible:bg-muted"
            onClick={() => setType("group")}
          >
            <TagsIcon className="size-6 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-base">
                {t("pages.newLabelItemModal.group")}
              </span>
              <span className="block text-sm text-muted-foreground">
                {t("pages.newLabelItemModal.groupDescription")}
              </span>
            </span>
          </button>
        </PageContent>
      )}
      {type === "label" && (
        <PageContent className="pt-8">
          <TextField
            label={t("pages.newLabelItemModal.labelTitleInput")}
            placeholder={t(
              "pages.newLabelItemModal.labelTitleInputPlaceholder",
            )}
            helperText={t("pages.newLabelItemModal.labelTitleInputHint")}
            value={title}
            onValueChange={setTitle}
          />
        </PageContent>
      )}
      {type === "group" && (
        <PageContent className="flex flex-col gap-4 pt-8">
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
            items={ungroupedItems}
            onSelectedItemsChange={selectedLabelsChange}
            noSelectedItemsText={t(
              "pages.manageLabelGroupModal.labels.noSelectedItems",
            )}
            noItemsText={t("pages.manageLabelGroupModal.labels.noItems")}
            searchPlaceholderText={t(
              "pages.manageLabelGroupModal.labels.search",
            )}
          />
        </PageContent>
      )}
      {type && (
        <PageFooter className="p-4">
          <Button
            size="lg"
            className="w-full"
            disabled={!title.length}
            onClick={save}
          >
            {t("generic.save")}
          </Button>
        </PageFooter>
      )}
    </ModalDialog>
  );
};
