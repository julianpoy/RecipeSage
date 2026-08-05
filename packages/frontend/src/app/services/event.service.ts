import { Injectable } from "@angular/core";

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
}

@Injectable({
  providedIn: "root",
})
export class EventService {
  eventListeners: { [key: string]: ((data: any) => void)[] } = {};

  constructor() {}

  subscribe(
    _eventNames: EventName | EventName[],
    listener: (data?: any) => void,
  ): void {
    const eventNames = [];
    if (Array.isArray(_eventNames)) eventNames.push(..._eventNames);
    else eventNames.push(_eventNames);

    for (const eventName of eventNames) {
      this.eventListeners[eventName] = this.eventListeners[eventName] || [];
      this.eventListeners[eventName].push(listener);
    }
  }

  unsubscribe(
    _eventNames: EventName | EventName[],
    listener: (data?: any) => void,
  ): void {
    const eventNames = [];
    if (Array.isArray(_eventNames)) eventNames.push(..._eventNames);
    else eventNames.push(_eventNames);

    for (const eventName of eventNames) {
      this.eventListeners[eventName] = this.eventListeners[eventName] || [];
      const idx = this.eventListeners[eventName].indexOf(listener);
      if (idx === -1) continue;
      this.eventListeners[eventName].splice(idx, 1);
    }
  }

  publish(eventName: EventName, data?: any) {
    this.eventListeners[eventName]?.slice().forEach((cb) => cb(data));
  }
}
