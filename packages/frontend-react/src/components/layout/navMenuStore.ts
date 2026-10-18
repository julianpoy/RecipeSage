import { create } from "zustand";

interface NavMenuState {
  open: boolean;
  splitPaneActive: boolean;
  setOpen: (open: boolean) => void;
}

export const navMenuStore = create<NavMenuState>((set) => ({
  open: false,
  splitPaneActive: false,
  setOpen: (open) => set({ open }),
}));
