import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ListIcon, XIcon } from "lucide-react";
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

export type NewShoppingListModalResult =
  | { success: true; id: string }
  | { success: false };

export const NewShoppingListModal = ({
  controls,
  openAfterCreate = true,
}: {
  controls: DialogControls<NewShoppingListModalResult>;
  openAfterCreate?: boolean;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<
    string[]
  >([]);

  const save = async () => {
    if (saving) return;

    setSaving(true);
    const loading = loadingService.start();

    const response = await serverActions.shoppingLists.createShoppingList({
      title: listTitle,
      collaboratorUserIds: selectedCollaboratorIds,
    });

    setSaving(false);
    loading.dismiss();
    if (!response) return;

    controls.close({
      success: true,
      id: response.id,
    });
    if (openAfterCreate) {
      void navigate({
        to: "/shopping-lists/$shoppingListId",
        params: { shoppingListId: response.id },
        replace: true,
      });
    }
  };

  const cancel = () => {
    controls.close({
      success: false,
    });
  };

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={<></>}
        title={t("pages.newShoppingList.title")}
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
      <PageContent className="flex flex-col gap-10">
        <TextField
          label={t("pages.newShoppingList.listTitle")}
          value={listTitle}
          onValueChange={setListTitle}
          type="text"
          autoCapitalize="on"
          autoCorrect="on"
        />

        <SelectCollaborators
          selectedCollaboratorIds={selectedCollaboratorIds}
          onSelectedCollaboratorIdsChanged={setSelectedCollaboratorIds}
        />
      </PageContent>
      <PageFooter className="p-4">
        <Button
          size="lg"
          className="w-full"
          disabled={!listTitle}
          onClick={() => void save()}
        >
          <ListIcon data-icon="inline-start" />
          {selectedCollaboratorIds.length === 0
            ? t("pages.newShoppingList.create")
            : t("pages.newShoppingList.createAndShare")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
