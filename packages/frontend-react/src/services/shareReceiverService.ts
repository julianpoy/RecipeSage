import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { SendIntent, type Intent } from "@mindlib-capacitor/send-intent";
import { pendingShareService } from "./pendingShareService";
import type { PendingShare } from "./pendingShareService";
import { EventName, events } from "./events";
import { session } from "../utils/session";
import { navigation } from "../routes/navigation";

const EDIT_NEW_RECIPE_PATH = "/edit-recipe/new";

const additionalUrls = (intent: Intent): string[] => {
  const items = intent.additionalItems;
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (item && typeof item === "object" ? item.url : undefined))
    .filter((url): url is string => typeof url === "string");
};

const base64ToBytes = (base64: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const fileNameFromPath = (path: string): string => {
  const clean = decodeURIComponent(path).split("?")[0];
  const base = clean.substring(clean.lastIndexOf("/") + 1);
  return base || "shared-file";
};

const readFile = async (
  path: string,
  type: string,
): Promise<File | undefined> => {
  const result = await Filesystem.readFile({
    path: decodeURIComponent(path),
  });
  if (typeof result.data !== "string") return undefined;
  const bytes = base64ToBytes(result.data);
  return new File([bytes], fileNameFromPath(path), {
    type: type || "application/octet-stream",
  });
};

const readFiles = async (paths: string[], type: string): Promise<File[]> => {
  const files: File[] = [];
  for (const path of paths) {
    try {
      const file = await readFile(path, type);
      if (file) files.push(file);
    } catch {
      // Skip files we cannot read rather than failing the whole share
    }
  }
  return files;
};

const toPendingShare = async (
  intent: Intent,
): Promise<PendingShare | undefined> => {
  const type = intent.type || "";
  const url = intent.url || "";
  const isFile = url.startsWith("file://") || url.startsWith("content://");

  if (!isFile) {
    const shared = url || intent.description || intent.title || "";
    if (!shared) return undefined;
    return { kind: "url", url: shared };
  }

  if (type.startsWith("image/")) {
    const paths = [url, ...additionalUrls(intent)];
    const files = await readFiles(paths, type);
    if (!files.length) return undefined;
    return { kind: "images", files };
  }

  const file = (await readFiles([url], type))[0];
  if (!file) return undefined;
  return { kind: "document", file };
};

const getAppPath = () => {
  const basepath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const pathname = window.location.pathname;
  return pathname.startsWith(basepath)
    ? pathname.slice(basepath.length)
    : pathname;
};

const routePending = () => {
  const pending = pendingShareService.peek();
  if (!pending) return;

  if (!session.isLoggedIn()) {
    navigation.navigateToHref("/auth/register");
    return;
  }

  if (getAppPath() === EDIT_NEW_RECIPE_PATH) {
    events.publish(EventName.ShareReceived);
  } else {
    navigation.navigateToHref(EDIT_NEW_RECIPE_PATH);
  }
};

const checkForShare = async () => {
  let intent: Intent;
  try {
    intent = await SendIntent.checkSendIntentReceived();
  } catch {
    return;
  }

  if (!intent || (!intent.url && !intent.title && !intent.description)) {
    return;
  }

  const pending = await toPendingShare(intent);
  if (!pending) return;

  pendingShareService.set(pending);
  routePending();
};

export const shareReceiverService = {
  init() {
    if (!Capacitor.isNativePlatform()) return;

    window.addEventListener("sendIntentReceived", () => {
      void checkForShare();
    });

    events.subscribe(EventName.Auth, () => {
      routePending();
    });

    void checkForShare();
  },
};
