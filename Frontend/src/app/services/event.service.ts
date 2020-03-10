import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  eventListeners = {};

  constructor() {}

  subscribe(eventName: string, listener: () => void) {
    this.eventListeners[eventName] = this.eventListeners[eventName] || [];
    this.eventListeners[eventName].push(listener);
  }

  publish(eventName: string, data?: any) {
    this.eventListeners[eventName]?.map(cb => cb(data))
  }
}

