import { toast } from "@/components/ui/toast";

export interface ToastOptions {
  message: string;
  duration?: number;
  action?: {
    text: string;
    handler: () => void;
  };
}

export const showToast = ({ message, duration, action }: ToastOptions) =>
  toast.add({
    description: message,
    timeout: duration ?? 0,
    actionProps: action
      ? {
          children: action.text,
          onClick: action.handler,
        }
      : undefined,
  });
