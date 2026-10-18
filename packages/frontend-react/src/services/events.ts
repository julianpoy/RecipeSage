export enum EventName {
  RecipeCreated = "recipe:created",
  RecipeUpdated = "recipe:updated",
  RecipeDeleted = "recipe:deleted",
  LabelCreated = "label:created",
  LabelUpdated = "label:updated",
  LabelDeleted = "label:deleted",
  ImportPepperplateComplete = "import:pepperplate:complete",
  ImportPepperplateFailed = "import:pepperplate:failed",
  ImportPepperplateWorking = "import:pepperplate:working",
  ApplicationMultitaskingResumed = "application:multitasking:resumed",
  ApplicationLanguageChanged = "application:language:changed",
  ApplicationSplitPaneChanged = "application:splitpane:changed",
  ApplicationOfflineModeChanged = "application:offlinemode:changed",
  Auth = "auth",
  CapabilitiesUpdated = "capabilities:updated",
  ShareReceived = "share:received",
}

export type EventListener = (data?: unknown) => void;

const eventListeners = new Map<EventName, EventListener[]>();

const toArray = (eventNames: EventName | EventName[]) =>
  Array.isArray(eventNames) ? eventNames : [eventNames];

export const events = {
  subscribe(eventNames: EventName | EventName[], listener: EventListener) {
    for (const eventName of toArray(eventNames)) {
      const listeners = eventListeners.get(eventName) || [];
      listeners.push(listener);
      eventListeners.set(eventName, listeners);
    }
  },

  unsubscribe(eventNames: EventName | EventName[], listener: EventListener) {
    for (const eventName of toArray(eventNames)) {
      const listeners = eventListeners.get(eventName);
      if (!listeners) continue;
      const idx = listeners.indexOf(listener);
      if (idx === -1) continue;
      listeners.splice(idx, 1);
    }
  },

  publish(eventName: EventName, data?: unknown) {
    eventListeners
      .get(eventName)
      ?.slice()
      .forEach((listener) => listener(data));
  },
};
