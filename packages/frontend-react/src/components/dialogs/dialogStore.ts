import type { ReactNode } from "react";
import { create } from "zustand";

export interface DialogEntry {
  id: number;
  open: boolean;
  render: (open: boolean) => ReactNode;
}

interface DialogStoreState {
  entries: DialogEntry[];
}

export const dialogStore = create<DialogStoreState>(() => ({
  entries: [],
}));
