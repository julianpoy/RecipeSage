import { create } from "zustand";

export interface LoadingRef {
  dismiss: () => void;
}

const REQUEST_COMPLETE_DELAY = 150;

export const loadingStore = create<{ activeCount: number }>(() => ({
  activeCount: 0,
}));

export const loadingService = {
  start(): LoadingRef {
    loadingStore.setState((state) => ({ activeCount: state.activeCount + 1 }));

    let dismissed = false;
    return {
      dismiss: () => {
        if (dismissed) return;
        dismissed = true;
        setTimeout(() => {
          loadingStore.setState((state) => ({
            activeCount: Math.max(0, state.activeCount - 1),
          }));
        }, REQUEST_COMPLETE_DELAY);
      },
    };
  },
};
