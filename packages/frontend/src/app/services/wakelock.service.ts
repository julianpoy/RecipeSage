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
  wakeLockPending: Promise<WakeLockSentinel> | null = null;
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
    if (this.wakeLock || this.wakeLockPending || !this.isCapable) return;

    let wakeLock: WakeLockSentinel;
    try {
      this.wakeLockPending = navigator.wakeLock.request("screen");
      wakeLock = await this.wakeLockPending;
    } catch (e) {
      return;
    } finally {
      this.wakeLockPending = null;
    }

    if (this.wakeLockRequests.length === 0) {
      this.releaseSentinel(wakeLock);
      return;
    }

    this.wakeLock = wakeLock;
    wakeLock.addEventListener("release", () => {
      if (this.wakeLock === wakeLock) this.wakeLock = null;
    });

    console.log("WakeLock requested");
  }

  private async releaseWakeLock() {
    if (!this.wakeLock) return;

    const wakeLock = this.wakeLock;
    this.wakeLock = null;
    this.releaseSentinel(wakeLock);

    console.log("WakeLock released");
  }

  private releaseSentinel(wakeLock: WakeLockSentinel) {
    wakeLock.release().catch(() => {});
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
