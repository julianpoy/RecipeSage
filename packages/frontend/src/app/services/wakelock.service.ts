import { Injectable } from "@angular/core";

interface WakelockRequest {
  release: () => void;
}

@Injectable({
  providedIn: "root",
})
export class WakeLockService {
  isCapable = "wakeLock" in navigator;
  wakeLock: WakeLockSentinel | null = null;
  wakeLockRequests: WakelockRequest[] = [];

  constructor() {
    document.addEventListener("visibilitychange", () =>
      this.onVisiblityChange(),
    );
    document.addEventListener("fullscreenchange", () =>
      this.onVisiblityChange(),
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

  release(wakeLockRequest: WakelockRequest) {
    const idx = this.wakeLockRequests.indexOf(wakeLockRequest);
    if (idx > -1) this.wakeLockRequests.splice(idx, 1);

    if (this.wakeLockRequests.length === 0) this.releaseWakeLock();
  }

  private async requestWakeLock() {
    if (!this.wakeLock && this.isCapable) {
      try {
        this.wakeLock = await navigator.wakeLock.request("screen");
        if (!this.wakeLock) return;

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
