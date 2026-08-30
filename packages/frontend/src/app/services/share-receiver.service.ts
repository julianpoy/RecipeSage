import { Injectable, NgZone, inject } from "@angular/core";
import { Router } from "@angular/router";
import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { SendIntent, type Intent } from "@mindlib-capacitor/send-intent";
import {
  PendingShareService,
  type PendingShare,
} from "./pending-share.service";
import { UtilService, RouteMap, AuthType } from "./util.service";
import { EventName, EventService } from "./event.service";

@Injectable({
  providedIn: "root",
})
export class ShareReceiverService {
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private pendingShareService = inject(PendingShareService);
  private utilService = inject(UtilService);
  private events = inject(EventService);

  init() {
    if (!Capacitor.isNativePlatform()) return;

    window.addEventListener("sendIntentReceived", () => {
      void this.checkForShare();
    });

    this.events.subscribe(EventName.Auth, () => {
      void this.routePending();
    });

    void this.checkForShare();
  }

  private async checkForShare() {
    let intent: Intent;
    try {
      intent = await SendIntent.checkSendIntentReceived();
    } catch {
      return;
    }

    if (!intent || (!intent.url && !intent.title && !intent.description)) {
      return;
    }

    const pending = await this.toPendingShare(intent);

    if (!pending) return;

    this.pendingShareService.set(pending);
    this.routePending();
  }

  private async toPendingShare(
    intent: Intent,
  ): Promise<PendingShare | undefined> {
    const type = intent.type || "";
    const url = intent.url || "";

    const isFile = url.startsWith("file://") || url.startsWith("content://");

    if (!isFile) {
      const shared = url || intent.description || intent.title || "";
      if (!shared) return undefined;
      return { kind: "url", url: shared };
    }

    if (type.startsWith("image/")) {
      const paths = [url, ...this.additionalUrls(intent)];
      const files = await this.readFiles(paths, type);
      if (!files.length) return undefined;
      return { kind: "images", files };
    }

    const file = (await this.readFiles([url], type))[0];
    if (!file) return undefined;
    return { kind: "document", file };
  }

  private additionalUrls(intent: Intent): string[] {
    const items = intent.additionalItems;
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => (item && typeof item === "object" ? item.url : undefined))
      .filter((url): url is string => typeof url === "string");
  }

  private async readFiles(paths: string[], type: string): Promise<File[]> {
    const files: File[] = [];
    for (const path of paths) {
      try {
        const file = await this.readFile(path, type);
        if (file) files.push(file);
      } catch {
        // Skip files we cannot read rather than failing the whole share
      }
    }
    return files;
  }

  private async readFile(
    path: string,
    type: string,
  ): Promise<File | undefined> {
    const result = await Filesystem.readFile({
      path: decodeURIComponent(path),
    });
    if (typeof result.data !== "string") return undefined;
    const bytes = this.base64ToBytes(result.data);
    return new File([bytes], this.fileNameFromPath(path), {
      type: type || "application/octet-stream",
    });
  }

  private base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  private fileNameFromPath(path: string): string {
    const clean = decodeURIComponent(path).split("?")[0];
    const base = clean.substring(clean.lastIndexOf("/") + 1);
    return base || "shared-file";
  }

  private routePending() {
    const pending = this.pendingShareService.peek();
    if (!pending) return;

    if (!this.utilService.isLoggedIn()) {
      this.ngZone.run(() => {
        void this.router.navigateByUrl(
          RouteMap.AuthPage.getPath(AuthType.Register),
        );
      });
      return;
    }

    this.ngZone.run(() => {
      const currentPath = this.router.url.split("?")[0];
      if (currentPath === RouteMap.EditRecipePage.getPath("new")) {
        this.events.publish(EventName.ShareReceived);
      } else {
        void this.router.navigateByUrl(RouteMap.EditRecipePage.getPath("new"));
      }
    });
  }
}
