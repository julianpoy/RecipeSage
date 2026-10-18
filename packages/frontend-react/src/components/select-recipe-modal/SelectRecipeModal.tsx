import { useTranslation } from "react-i18next";
import { XIcon } from "lucide-react";
import type { RecipeSummary } from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { ModalDialog } from "../dialogs/ModalDialog";
import type { DialogControls } from "../dialogs/openDialog";
import { PageContent } from "../layout/PageContent";
import { PageHeader } from "../layout/PageHeader";
import { SelectRecipe } from "../select-recipe/SelectRecipe";

export const SelectRecipeModal = ({
  controls,
}: {
  controls: DialogControls<RecipeSummary>;
}) => {
  const { t } = useTranslation();

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={<></>}
        title={t("components.selectRecipeModal.title")}
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
        <SelectRecipe
          enableSelectedState={false}
          onSelectedRecipeChange={(recipe) => {
            if (recipe) controls.close(recipe);
          }}
        />
      </PageContent>
    </ModalDialog>
  );
};
