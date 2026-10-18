import type { ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { DialogControls } from "./openDialog";

export const ModalDialog = <TResult,>({
  controls,
  dismissible = true,
  className,
  children,
}: {
  controls: DialogControls<TResult>;
  dismissible?: boolean;
  className?: string;
  children: ReactNode;
}) => (
  <Dialog
    open={controls.open}
    disablePointerDismissal={!dismissible}
    onOpenChange={(open) => {
      if (!open) controls.close();
    }}
    onOpenChangeComplete={(open) => {
      if (!open) controls.remove();
    }}
  >
    <DialogContent
      showCloseButton={false}
      className={cn(
        "flex flex-col gap-0 overflow-hidden p-0 sm:h-[min(90vh,820px)] sm:max-w-2xl",
        "max-sm:start-0 max-sm:top-0 max-sm:h-full max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:rtl:translate-x-0",
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>
    </DialogContent>
  </Dialog>
);
