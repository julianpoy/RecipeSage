import { Injectable } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import {
  deleteCachedImage,
  getCachedImage,
  getOldestCachedImages,
  getTotalCachedBytes,
  putCachedImage,
  touchCachedImage,
} from "../utils/imageCacheDb";

const CACHE_SUBDIR = "image-cache";
const MAX_CACHE_BYTES = 150 * 1024 * 1024;
const EVICTION_BATCH = 25;

@Injectable({
  providedIn: "root",
})
export class ImageCacheService {
  private isNative = Capacitor.isNativePlatform();
  private inFlight = new Set<string>();

  async prime(remoteUrl: string): Promise<void> {
    if (!this.isNative || !this.isCacheable(remoteUrl)) return;

    try {
      const entry = await getCachedImage(remoteUrl);
      if (entry) {
        void touchCachedImage(remoteUrl);
        return;
      }
    } catch {
      return;
    }

    void this.cache(remoteUrl);
  }

  async resolveCached(remoteUrl: string): Promise<string | null> {
    if (!this.isNative || !this.isCacheable(remoteUrl)) return null;

    try {
      const entry = await getCachedImage(remoteUrl);
      if (!entry) return null;
      void touchCachedImage(remoteUrl);
      const { uri } = await Filesystem.getUri({
        path: entry.path,
        directory: Directory.Cache,
      });
      return Capacitor.convertFileSrc(uri);
    } catch {
      return null;
    }
  }

  private isCacheable(url: string): boolean {
    if (!/^https?:\/\//.test(url)) return false;
    try {
      return new URL(url).hostname !== self.location.hostname;
    } catch {
      return false;
    }
  }

  private async cache(remoteUrl: string): Promise<void> {
    if (this.inFlight.has(remoteUrl)) return;
    this.inFlight.add(remoteUrl);

    try {
      const response = await fetch(remoteUrl);
      if (!response.ok) return;

      const blob = await response.blob();
      const base64 = await this.blobToBase64(blob);
      const path = `${CACHE_SUBDIR}/${await this.fileNameFor(remoteUrl)}`;

      await Filesystem.writeFile({
        path,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      });

      await putCachedImage({
        url: remoteUrl,
        path,
        bytes: blob.size,
        lastUsed: Date.now(),
      });

      await this.evictIfNeeded();
    } catch {
      // A caching failure is non-fatal; the remote URL is already shown.
    } finally {
      this.inFlight.delete(remoteUrl);
    }
  }

  private async evictIfNeeded(): Promise<void> {
    let total = await getTotalCachedBytes();
    if (total <= MAX_CACHE_BYTES) return;

    const candidates = await getOldestCachedImages(EVICTION_BATCH);
    for (const entry of candidates) {
      if (total <= MAX_CACHE_BYTES) break;
      try {
        await Filesystem.deleteFile({
          path: entry.path,
          directory: Directory.Cache,
        });
      } catch {
        // File may already be gone; still drop the manifest entry.
      }
      await deleteCachedImage(entry.url);
      total -= entry.bytes;
    }
  }

  private async fileNameFor(url: string): Promise<string> {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(url),
    );
    let name = "";
    for (const byte of new Uint8Array(digest)) {
      name += byte.toString(16).padStart(2, "0");
    }

    const match = /\.(jpe?g|png|webp|gif|avif)(?:$|\?)/i.exec(url);
    const ext = match ? `.${match[1].toLowerCase()}` : "";
    return `${name}${ext}`;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Failed to read blob as data URL"));
          return;
        }
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.readAsDataURL(blob);
    });
  }
}
