import type { NutritionFilter } from "@recipesage/prisma";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { openDialog } from "../dialogs/openDialog";
import { i18n } from "../../i18n/i18n";
import { NutritionFilterPopover } from "./NutritionFilterPopover";

export const openNutritionFilterPopover = (props: {
  nutritionFilter: NutritionFilter;
}) =>
  openDialog<NutritionFilter>((controls) => (
    <Dialog
      open={controls.open}
      onOpenChange={(open) => {
        if (!open) controls.close();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) controls.remove();
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-label={i18n.t("components.nutritionFilterPopover.title")}
        className="w-[360px] max-w-[90vw] gap-0 overflow-hidden p-0 sm:max-w-[360px]"
      >
        <NutritionFilterPopover
          nutritionFilter={props.nutritionFilter}
          onApply={(nutritionFilter) => controls.close(nutritionFilter)}
        />
      </DialogContent>
    </Dialog>
  ));
