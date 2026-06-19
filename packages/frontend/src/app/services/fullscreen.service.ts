import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class FullscreenService {
  isCapable = !!document.documentElement.requestFullscreen;

  get isActive() {
    return !!document.fullscreenElement;
  }

  async request() {
    if (!this.isCapable || this.isActive) return;
    try {
      await document.documentElement.requestFullscreen();
    } catch (e) {}
  }

  async exit() {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch (e) {}
  }
}
