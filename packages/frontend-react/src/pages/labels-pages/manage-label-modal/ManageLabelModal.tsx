import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  FolderOpenIcon,
  GitForkIcon,
  SquarePenIcon,
  TagIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import type { LabelSummary } from "@recipesage/prisma";
import { cleanLabelTitle } from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { AlertModal } from "../../../components/alert-modal/AlertModal";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { showAlert } from "../../../components/dialogs/showAlert";
import { TextField } from "../../../components/forms/TextField";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { loadingService } from "../../../services/loadingService";
import { serverActions } from "../../../services/serverActions";
import { formatDate } from "../../../utils/formatDate";

export const ManageLabelModal = ({
  controls,
  label,
}: {
  controls: DialogControls<void>;
  label: LabelSummary;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [labelTitle, setLabelTitle] = useState(label.title);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeInput, setMergeInput] = useState("");

  const createdAt = formatDate(label.createdAt);

  const cancel = () => {
    controls.close();
  };

  const _rename = async (newTitle: string) => {
    const presentInvalidTitle = () => {
      void showAlert({
        header: t("pages.manageLabelModal.renameInvalid.header"),
        message: t("pages.manageLabelModal.renameInvalid.message"),
        buttons: [
          {
            text: t("generic.okay"),
            handler: () => {},
          },
        ],
      });
    };

    const cleanedTitle = cleanLabelTitle(newTitle);
    if (!cleanedTitle) {
      presentInvalidTitle();
      return;
    }

    const loading = loadingService.start();

    const response = await serverActions.labels.updateLabel(
      {
        id: label.id,
        title: cleanedTitle,
      },
      {
        400: presentInvalidTitle,
        409: () => {
          void showAlert({
            header: t("pages.manageLabelModal.renameConflict.header"),
            message: t("pages.manageLabelModal.renameConflict.message"),
            buttons: [
              {
                text: t("generic.okay"),
                handler: () => {},
              },
            ],
          });
        },
      },
    );
    loading.dismiss();
    if (!response) return;

    setLabelTitle(cleanedTitle);
  };

  const view = () => {
    controls.close();

    void navigate({
      to: "/list/$folder",
      params: { folder: "main" },
      search: { labels: labelTitle },
      state: { showBack: true },
    });
  };

  const rename = () => {
    setRenameInput(labelTitle);
    setIsRenameModalOpen(true);
  };

  const submitRename = () => {
    const title = renameInput;
    setIsRenameModalOpen(false);
    void _rename(title);
  };

  const _delete = async () => {
    const loading = loadingService.start();

    const response = await serverActions.labels.deleteLabel({
      id: label.id,
    });
    loading.dismiss();
    if (!response) return;

    controls.close();
  };

  const _deleteWithRecipes = async () => {
    const loading = loadingService.start();

    const response = await serverActions.labels.deleteLabel({
      id: label.id,
      includeAttachedRecipes: true,
    });
    loading.dismiss();
    if (!response) return;

    controls.close();
  };

  const deleteLabel = async () => {
    await showAlert({
      header: t("pages.manageLabelModal.delete.header", { name: labelTitle }),
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

  const deleteWithRecipes = async () => {
    await showAlert({
      header: t("pages.manageLabelModal.deleteWithRecipes.header", {
        name: labelTitle,
      }),
      message: t("pages.manageLabelModal.deleteWithRecipes.message", {
        name: labelTitle,
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
            void _deleteWithRecipes();
          },
        },
      ],
    });
  };

  const _merge = async (targetTitle: string) => {
    const loading = loadingService.start();

    const targetLabel = await serverActions.labels.getLabelByTitle(
      {
        title: targetTitle,
      },
      {
        404: () => {
          void showAlert({
            header: t("pages.manageLabelModal.notFound.header"),
            subHeader: t("pages.manageLabelModal.notFound.subHeader", {
              name: targetTitle,
            }),
            message: t("pages.manageLabelModal.notFound.message"),
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
    if (!targetLabel) {
      loading.dismiss();
      return;
    }

    if (targetLabel.id === label.id) {
      void showAlert({
        header: t("pages.manageLabelModal.selfMerge.header"),
        subHeader: t("pages.manageLabelModal.selfMerge.subHeader", {
          name: targetTitle,
        }),
        buttons: [
          {
            text: t("generic.okay"),
            role: "cancel",
          },
        ],
      });
      loading.dismiss();

      return;
    }

    const mergeResponse = await serverActions.labels.mergeLabels({
      sourceId: label.id,
      targetId: targetLabel.id,
    });

    loading.dismiss();
    if (!mergeResponse) return;

    void showAlert({
      header: t("pages.manageLabelModal.mergeComplete.header"),
      subHeader: t("pages.manageLabelModal.mergeComplete.subHeader", {
        sourceTitle: labelTitle,
        targetTitle: targetLabel.title,
      }),
      message: t("pages.manageLabelModal.mergeComplete.message", {
        sourceTitle: labelTitle,
        targetTitle: targetLabel.title,
      }),
      buttons: [
        {
          text: t("generic.okay"),
          role: "cancel",
        },
      ],
    });

    controls.close();
  };

  const merge = () => {
    setMergeInput("");
    setIsMergeModalOpen(true);
  };

  const submitMerge = () => {
    const title = mergeInput;
    setIsMergeModalOpen(false);
    void _merge(title);
  };

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={null}
        title={t("pages.manageLabelModal.title", { name: labelTitle })}
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
      <PageContent>
        <div className="flex items-center gap-6 px-4 py-2">
          <TagIcon className="size-6 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h2 dir="auto" className="text-base font-medium capitalize">
              {labelTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              <span>
                {t("pages.manageLabelModal.recipeCount", {
                  count: label._count.recipeLabels,
                })}
              </span>
              <br />
              {label.labelGroup ? (
                <span>
                  {t("pages.manageLabelModal.group", {
                    title: label.labelGroup.title,
                  })}
                </span>
              ) : (
                <span>{t("pages.manageLabelModal.noGroup")}</span>
              )}
              <br />
              <span>
                {t("pages.manageLabelModal.createdAt", {
                  dateString: createdAt,
                })}
              </span>
              <br />
            </p>
          </div>
        </div>
      </PageContent>
      <PageFooter className="flex flex-col gap-2 p-4">
        <Button size="lg" className="w-full" onClick={view}>
          <FolderOpenIcon data-icon="inline-start" />
          {t("pages.manageLabelModal.view")}
        </Button>
        <Button size="lg" className="w-full" onClick={rename}>
          <SquarePenIcon data-icon="inline-start" />
          {t("pages.manageLabelModal.rename")}
        </Button>
        <Button size="lg" className="w-full" onClick={merge}>
          <GitForkIcon data-icon="inline-start" />
          {t("pages.manageLabelModal.merge")}
        </Button>
        <Button
          size="lg"
          variant="destructive"
          className="w-full"
          onClick={() => void deleteLabel()}
        >
          <Trash2Icon data-icon="inline-start" />
          {t("pages.manageLabelModal.delete")}
        </Button>
        <Button
          size="lg"
          variant="destructive"
          className="w-full"
          onClick={() => void deleteWithRecipes()}
        >
          <Trash2Icon data-icon="inline-start" />
          {t("pages.manageLabelModal.deleteWithRecipes")}
        </Button>
      </PageFooter>

      <AlertModal
        open={isRenameModalOpen}
        onOpenChange={setIsRenameModalOpen}
        header={t("pages.manageLabelModal.rename.header", {
          name: labelTitle,
        })}
        onConfirm={submitRename}
      >
        <TextField
          value={renameInput}
          onValueChange={setRenameInput}
          placeholder={t("pages.manageLabelModal.rename.placeholder")}
        />
      </AlertModal>

      <AlertModal
        open={isMergeModalOpen}
        onOpenChange={setIsMergeModalOpen}
        header={t("pages.manageLabelModal.merge.header", {
          title: labelTitle,
        })}
        confirmLabel={t("generic.confirm")}
        onConfirm={submitMerge}
      >
        <p>
          {t("pages.manageLabelModal.merge.subHeader", { title: labelTitle })}
        </p>
        <p>
          {t("pages.manageLabelModal.merge.message", { title: labelTitle })}
        </p>
        <TextField
          value={mergeInput}
          onValueChange={setMergeInput}
          placeholder={t("pages.manageLabelModal.merge.placeholder")}
        />
      </AlertModal>
    </ModalDialog>
  );
};
