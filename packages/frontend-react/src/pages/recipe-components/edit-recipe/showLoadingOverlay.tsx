import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { openDialog } from "../../../components/dialogs/openDialog";
import { loadingService } from "../../../services/loadingService";

export const showLoadingOverlay = (message: string) => {
  const loading = loadingService.start();
  let close: (() => void) | undefined;
  let dismissed = false;

  void openDialog<void>((controls) => {
    close = () => controls.close();
    if (dismissed) queueMicrotask(close);
    return (
      <Dialog
        open={controls.open}
        disablePointerDismissal
        onOpenChangeComplete={(open) => {
          if (!open) controls.remove();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex w-auto max-w-[min(calc(100%-2rem),320px)] flex-row items-center gap-4 sm:max-w-xs"
        >
          <Spinner className="size-6 shrink-0" />
          <DialogTitle className="text-sm font-normal">{message}</DialogTitle>
        </DialogContent>
      </Dialog>
    );
  });

  return {
    dismiss: () => {
      if (dismissed) return;
      dismissed = true;
      loading.dismiss();
      close?.();
    },
  };
};
