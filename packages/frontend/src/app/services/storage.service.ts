import { Injectable, PLATFORM_ID, inject } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";

@Injectable({
  providedIn: "root",
})
export class StorageService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private memoryStore = new Map<string, string>();

  getItem(key: string): string | null {
    if (this.isBrowser) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return this.memoryStore.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.isBrowser) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // swallow quota / private-mode errors
      }
      return;
    }
    this.memoryStore.set(key, value);
  }

  removeItem(key: string): void {
    if (this.isBrowser) {
      try {
        localStorage.removeItem(key);
      } catch {
        // swallow
      }
      return;
    }
    this.memoryStore.delete(key);
  }
}
