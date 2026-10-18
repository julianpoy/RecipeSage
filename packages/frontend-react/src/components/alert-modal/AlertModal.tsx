import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const AlertModal = ({
  open,
  onOpenChange,
  header,
  message,
  cancelLabel,
  confirmLabel,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  header: ReactNode;
  message?: ReactNode;
  cancelLabel?: ReactNode;
  confirmLabel?: ReactNode;
  onConfirm: () => void;
  children?: ReactNode;
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen !== open) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        role="alertdialog"
        showCloseButton={false}
        className="max-w-[280px] gap-4 sm:max-w-[350px]"
      >
        <DialogHeader>
          <DialogTitle>{header}</DialogTitle>
          {message && <DialogDescription>{message}</DialogDescription>}
        </DialogHeader>
        {children && <div className="flex flex-col gap-2">{children}</div>}
        <DialogFooter className="flex-row flex-wrap justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel || t("generic.cancel")}
          </Button>
          <Button onClick={onConfirm}>
            {confirmLabel || t("generic.okay")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
