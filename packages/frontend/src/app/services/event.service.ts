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
  Auth = "auth",
}

@Injectable({
  providedIn: "root",
})
export class EventService {
  eventListeners: { [key: string]: ((data: any) => void)[] } = {};

  constructor() {}

  subscribe(_eventNames: EventName | EventName[], listener: () => void): void {
    const eventNames = [];
    if (Array.isArray(_eventNames)) eventNames.push(..._eventNames);
    else eventNames.push(_eventNames);

    for (const eventName of eventNames) {
      this.eventListeners[eventName] = this.eventListeners[eventName] || [];
      this.eventListeners[eventName].push(listener);
    }
  }

  publish(eventName: EventName, data?: any) {
    this.eventListeners[eventName]?.map((cb) => cb(data));
  }
}
