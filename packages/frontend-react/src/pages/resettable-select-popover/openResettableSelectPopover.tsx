import type { ComponentProps } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { openDialog } from "../../components/dialogs/openDialog";
import { ResettableSelectPopover } from "./ResettableSelectPopover";

export const openResettableSelectPopover = (
  props: Omit<ComponentProps<typeof ResettableSelectPopover>, "onDone">,
) =>
  openDialog<string[]>((controls) => (
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
        className="w-[320px] max-w-[90vw] gap-0 overflow-hidden p-0 sm:max-w-[320px]"
      >
        <ResettableSelectPopover
          {...props}
          onDone={(selectedValues) => controls.close(selectedValues)}
        />
      </DialogContent>
    </Dialog>
  ));
