import { create } from "zustand";
import type { RouterOutputs } from "../services/server-actions/ActionsBase";
import { usersActions } from "../services/server-actions/usersActions";
import { EventName, events } from "../services/events";
import { session } from "../utils/session";

type Capabilities = RouterOutputs["users"]["getMyCapabilities"];

const CAPABILITY_RETRY_RATE = 5000;

const DEFAULT_CAPABILITIES: Capabilities = {
  highResImages: false,
  multipleImages: false,
  expandablePreviews: false,
  assistantMoreMessages: false,
  moreUsageCredits: false,
};

let retryTimeout: ReturnType<typeof setTimeout> | undefined;

export const capabilitiesStore = create<{
  capabilities: Capabilities;
  updateCapabilities: () => Promise<void>;
}>((set, get) => {
  const retry = () => {
    if (retryTimeout) clearTimeout(retryTimeout);

    retryTimeout = setTimeout(() => {
      void get().updateCapabilities();
    }, CAPABILITY_RETRY_RATE);
  };

  return {
    capabilities: { ...DEFAULT_CAPABILITIES },

    updateCapabilities: async () => {
      if (!session.isLoggedIn()) {
        set({ capabilities: { ...DEFAULT_CAPABILITIES } });
        events.publish(EventName.CapabilitiesUpdated);
        return;
      }

      const response = await usersActions.getMyCapabilities({
        401: () => {},
      });
      if (!response) return retry();

      set({ capabilities: response });
      events.publish(EventName.CapabilitiesUpdated);
    },
  };
});

events.subscribe(EventName.Auth, () => {
  void capabilitiesStore.getState().updateCapabilities();
});

void capabilitiesStore.getState().updateCapabilities();
