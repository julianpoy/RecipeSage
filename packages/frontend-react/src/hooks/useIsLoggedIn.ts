import { useSyncExternalStore } from "react";
import { EventName, events } from "../services/events";
import { session } from "../utils/session";

const subscribe = (onChange: () => void) => {
  events.subscribe(EventName.Auth, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    events.unsubscribe(EventName.Auth, onChange);
    window.removeEventListener("storage", onChange);
  };
};

export const useIsLoggedIn = () =>
  useSyncExternalStore(subscribe, session.isLoggedIn);
