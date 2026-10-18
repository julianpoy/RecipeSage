import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ListIcon, XIcon } from "lucide-react";
import type { ShoppingListSummary } from "@recipesage/prisma";
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

export interface UpdateShoppingListModalResult {
  success: boolean;
}

export type UpdateShoppingListModalShoppingList = Pick<
  ShoppingListSummary,
  "id" | "title" | "collaboratorUsers"
>;

export const UpdateShoppingListModal = ({
  controls,
  shoppingList,
}: {
  controls: DialogControls<UpdateShoppingListModalResult>;
  shoppingList: UpdateShoppingListModalShoppingList;
}) => {
  const { t } = useTranslation();
  const [listTitle, setListTitle] = useState(shoppingList.title);
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState(() =>
    shoppingList.collaboratorUsers.map(
      (collaboratorUser) => collaboratorUser.user.id,
    ),
  );

  const save = async () => {
    const loading = loadingService.start();

    const response = await serverActions.shoppingLists.updateShoppingList({
      id: shoppingList.id,
      title: listTitle,
      collaboratorUserIds: selectedCollaboratorIds,
    });

    loading.dismiss();
    if (!response) return;

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
        title={t("pages.updateShoppingList.title")}
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
          label={t("pages.updateShoppingList.listTitle")}
          value={listTitle}
          onValueChange={setListTitle}
          type="text"
          autoCapitalize="on"
          autoComplete="on"
          autoCorrect="on"
          spellCheck
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
            ? t("pages.updateShoppingList.update")
            : t("pages.updateShoppingList.updateAndShare")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
