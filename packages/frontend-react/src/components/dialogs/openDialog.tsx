import type { ReactNode } from "react";
import { dialogStore } from "./dialogStore";

export interface DialogControls<TResult> {
  open: boolean;
  close: (result?: TResult) => void;
  remove: () => void;
}

let nextDialogId = 0;

export const openDialog = <TResult,>(
  render: (controls: DialogControls<TResult>) => ReactNode,
): Promise<TResult | undefined> =>
  new Promise((resolve) => {
    const id = nextDialogId++;
    let settled = false;

    const remove = () => {
      dialogStore.setState((state) => ({
        entries: state.entries.filter((entry) => entry.id !== id),
      }));
    };

    const close = (result?: TResult) => {
      if (settled) return;
      settled = true;
      dialogStore.setState((state) => ({
        entries: state.entries.map((entry) =>
          entry.id === id ? { ...entry, open: false } : entry,
        ),
      }));
      resolve(result);
    };

    dialogStore.setState((state) => ({
      entries: [
        ...state.entries,
        {
          id,
          open: true,
          render: (open) => render({ open, close, remove }),
        },
      ],
    }));
  });
