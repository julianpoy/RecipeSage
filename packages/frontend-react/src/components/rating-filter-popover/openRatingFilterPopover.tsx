import { Dialog, DialogContent } from "@/components/ui/dialog";
import { openDialog } from "../dialogs/openDialog";
import { i18n } from "../../i18n/i18n";
import { RatingFilterPopover } from "./RatingFilterPopover";

export const openRatingFilterPopover = (props: {
  ratingFilter: (number | null)[];
}) =>
  openDialog<(number | null)[]>((controls) => (
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
        aria-label={i18n.t("components.ratingFilter.title")}
        className="w-[320px] max-w-[90vw] gap-0 overflow-hidden p-0 sm:max-w-[320px]"
      >
        <RatingFilterPopover
          ratingFilter={props.ratingFilter}
          onApply={(ratingFilter) => controls.close(ratingFilter)}
        />
      </DialogContent>
    </Dialog>
  ));
