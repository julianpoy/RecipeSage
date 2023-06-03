import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class WakeLockService {
  isCapable = "wakeLock" in navigator;
  wakeLock = null;
  wakeLockRequests = [];

  constructor() {
    document.addEventListener("visibilitychange", () =>
      this.onVisiblityChange()
    );
    document.addEventListener("fullscreenchange", () =>
      this.onVisiblityChange()
    );
  }

  async request() {
    const wakeLockRequest = {
      release: () => {
        this.release(wakeLockRequest);
      },
    };
    this.wakeLockRequests.push(wakeLockRequest);
    await this.requestWakeLock();
    return wakeLockRequest;
  }

  release(wakeLockRequest) {
    const idx = this.wakeLockRequests.indexOf(wakeLockRequest);
    if (idx > -1) this.wakeLockRequests.splice(idx, 1);

    if (this.wakeLockRequests.length === 0) this.releaseWakeLock();
  }

  private async requestWakeLock() {
    if (!this.wakeLock && this.isCapable) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request("screen");
        this.wakeLock.addEventListener("release", () => {
          this.wakeLock = null;
        });

        console.log("WakeLock requested");
      } catch (e) {
        this.wakeLock = null;
      }
    }
  }

  private async releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch (e) {}
      this.wakeLock = null;

      console.log("WakeLock released");
    }
  }

  private onVisiblityChange() {
    if (
      this.wakeLockRequests.length > 0 &&
      document.visibilityState === "visible"
    ) {
      this.requestWakeLock();
    }
  }
}
