import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SaveIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { TextArea } from "../../../components/forms/TextArea";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { serverActions } from "../../../services/serverActions";

export const ShoppingListCategoryOrderModal = ({
  controls,
  shoppingListId,
  categoryOrder: initialCategoryOrder,
}: {
  controls: DialogControls<void>;
  shoppingListId: string;
  categoryOrder: string | undefined;
}) => {
  const { t } = useTranslation();
  const [categoryOrder, setCategoryOrder] = useState(initialCategoryOrder);

  const close = () => {
    controls.close();
  };

  const save = async () => {
    await serverActions.shoppingLists.updateShoppingList({
      id: shoppingListId,
      categoryOrder,
    });
    close();
  };

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={null}
        title={t("pages.shoppingListCategoryOrderModal.title")}
        end={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit"
            aria-label={t("generic.close")}
            onClick={close}
          >
            <XIcon className="size-6" />
          </Button>
        }
      />
      <PageContent className="flex flex-col gap-4">
        <div className="text-base">
          {t("pages.shoppingListCategoryOrderModal.description")}
          <p className="mt-1 text-sm text-muted-foreground">
            {t("pages.shoppingListCategoryOrderModal.instructions")}
          </p>
        </div>

        <TextArea
          label={t("pages.shoppingListCategoryOrderModal.label")}
          placeholder={t("pages.shoppingListCategoryOrderModal.placeholder")}
          value={categoryOrder ?? ""}
          onValueChange={setCategoryOrder}
          rows={8}
          autoGrow
        />
      </PageContent>
      <PageFooter className="p-4">
        <Button size="lg" className="w-full" onClick={() => void save()}>
          <SaveIcon data-icon="inline-start" />
          {t("generic.save")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
