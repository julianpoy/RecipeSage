import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SaveIcon, XIcon } from "lucide-react";
import { ShoppingListPreferenceKey } from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { TextArea } from "../../../components/forms/TextArea";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { preferencesStore } from "../../../stores/preferencesStore";

export const ShoppingListIgnoreModal = ({
  controls,
}: {
  controls: DialogControls<void>;
}) => {
  const { t } = useTranslation();
  const [ignoreItemTitles, setIgnoreItemTitles] = useState(
    () =>
      preferencesStore.getState().preferences[
        ShoppingListPreferenceKey.IgnoreItemTitles
      ],
  );

  const save = () => {
    preferencesStore
      .getState()
      .setPreference(
        ShoppingListPreferenceKey.IgnoreItemTitles,
        ignoreItemTitles,
      );
  };

  const close = () => {
    controls.close();
  };

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={null}
        title={t("pages.shoppingListIgnoreModal.title")}
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
          {t("pages.shoppingListIgnoreModal.description")}
          <p className="mt-1 text-sm text-muted-foreground">
            {t("pages.shoppingListIgnoreModal.instructions")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("pages.shoppingListIgnoreModal.scopeNote")}
          </p>
        </div>

        <TextArea
          label={t("pages.shoppingListIgnoreModal.label")}
          placeholder={t("pages.shoppingListIgnoreModal.placeholder")}
          value={ignoreItemTitles}
          onValueChange={setIgnoreItemTitles}
          rows={8}
          autoGrow
        />
      </PageContent>
      <PageFooter className="p-4">
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            save();
            close();
          }}
        >
          <SaveIcon data-icon="inline-start" />
          {t("generic.save")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
