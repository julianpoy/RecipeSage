import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DialogControls } from "./openDialog";

export type AlertValues = Record<string, string>;

export interface AlertButton {
  text: string;
  role?: string;
  variant?: "default" | "destructive" | "outline" | "ghost";
  handler?: (values: AlertValues) => boolean | void | Promise<boolean | void>;
}

export interface AlertInput {
  name: string;
  type?: "text" | "textarea";
  placeholder?: string;
  value?: string;
  maxLength?: number;
}

export interface AlertOptions {
  header?: ReactNode;
  subHeader?: ReactNode;
  message?: ReactNode;
  preline?: boolean;
  inputs?: AlertInput[];
  buttons: AlertButton[];
  dismissible?: boolean;
}

export interface AlertResult {
  role?: string;
  values: AlertValues;
}

const getButtonVariant = (button: AlertButton, isLast: boolean) => {
  if (button.variant) return button.variant;
  if (button.role === "cancel") return "outline";
  if (button.role === "destructive") return "destructive";
  return isLast ? "default" : "ghost";
};

export const AlertView = ({
  options,
  controls,
}: {
  options: AlertOptions;
  controls: DialogControls<AlertResult>;
}) => {
  const [values, setValues] = useState<AlertValues>(() =>
    Object.fromEntries(
      (options.inputs || []).map((input) => [input.name, input.value || ""]),
    ),
  );

  const onButtonClick = async (button: AlertButton) => {
    const handlerResult = await button.handler?.(values);
    if (handlerResult === false) return;
    controls.close({ role: button.role, values });
  };

  const onDismiss = async () => {
    const cancelButton = options.buttons.find(
      (button) => button.role === "cancel",
    );
    await cancelButton?.handler?.(values);
    controls.close({ role: "backdrop", values });
  };

  return (
    <Dialog
      open={controls.open}
      disablePointerDismissal={options.dismissible === false}
      onOpenChange={(open) => {
        if (!open) void onDismiss();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) controls.remove();
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          {options.header && <DialogTitle>{options.header}</DialogTitle>}
          {options.subHeader && (
            <div className="text-sm font-medium">{options.subHeader}</div>
          )}
          {options.message && (
            <DialogDescription
              className={cn(options.preline && "whitespace-pre-line")}
            >
              {options.message}
            </DialogDescription>
          )}
        </DialogHeader>
        {options.inputs?.map((input) =>
          input.type === "textarea" ? (
            <Textarea
              key={input.name}
              dir="auto"
              maxLength={input.maxLength}
              placeholder={input.placeholder}
              value={values[input.name]}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  [input.name]: event.target.value,
                }))
              }
            />
          ) : (
            <Input
              key={input.name}
              dir="auto"
              maxLength={input.maxLength}
              placeholder={input.placeholder}
              value={values[input.name]}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  [input.name]: event.target.value,
                }))
              }
            />
          ),
        )}
        <DialogFooter className="flex-row flex-wrap justify-end">
          {options.buttons.map((button, idx) => (
            <Button
              key={idx}
              variant={getButtonVariant(
                button,
                idx === options.buttons.length - 1,
              )}
              onClick={() => void onButtonClick(button)}
            >
              {button.text}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
