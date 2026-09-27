import {
  app,
  BrowserWindow,
  ipcMain,
  net,
  Notification,
  protocol,
  shell,
} from "electron";
import type { BrowserWindowConstructorOptions, WebContents } from "electron";
import path from "path";
import fs from "fs/promises";
import { pathToFileURL } from "url";
import squirrelStartup from "electron-squirrel-startup";
import { startUpdateChecker } from "./updateChecker";
import type { DesktopNotification } from "./DesktopNotification";

if (squirrelStartup) app.quit();

declare const process: NodeJS.Process & { resourcesPath: string };

const isDev = process.env.NODE_ENV === "development";
const WEBUI_URL = process.env.WEBUI_URL;
if (isDev && !WEBUI_URL) throw new Error("WEBUI_URL must be provided");

const RENDERER_SCHEME = "recipesage-app";
const RENDERER_HOST = "desktop";
const PROTOCOL_SCHEME = "recipesage";
const BASE_HREF = "/app/";
const IMAGE_CACHE_PATH_PATTERN =
  /^image-cache\/[0-9a-f]{64}(\.(jpe?g|png|webp|gif|avif))?$/;

protocol.registerSchemesAsPrivileged([
  {
    scheme: RENDERER_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function registerAsProtocolClient(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
  }
}

const shownNotifications = new Map<string, Notification>();

function getRendererDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "renderer");
  }
  return path.join(app.getAppPath(), "renderer");
}

function resolveImageCachePath(cachePath: string): string | null {
  if (!IMAGE_CACHE_PATH_PATTERN.test(cachePath)) return null;
  return path.join(app.getPath("userData"), cachePath);
}

function handleProtocolUrl(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${PROTOCOL_SCHEME}:`) return;
    if (parsed.hostname !== "auth") return;

    const code = parsed.searchParams.get("code");
    if (!code) return;

    const targetWindow = getTargetWindow();
    targetWindow?.webContents.send("auth-code", code);
    targetWindow?.focus();
  } catch {
    // Ignore malformed URLs
  }
}

function getWindowOptions(): BrowserWindowConstructorOptions {
  return {
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "RecipeSage",
    autoHideMenuBar: true,
    titleBarStyle: "default",
    tabbingIdentifier: "recipesage",
    icon: app.isPackaged
      ? path.join(process.resourcesPath, "icons", "recipesage.png")
      : path.join(__dirname, "../../icons/recipesage.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  };
}

function setupWindowOpenHandler(webContents: WebContents): void {
  webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`${RENDERER_SCHEME}://${RENDERER_HOST}/`)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: getWindowOptions(),
      };
    }

    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("mailto:")
    ) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  webContents.on("did-create-window", (childWindow) => {
    setupWindowOpenHandler(childWindow.webContents);
  });
}

function createWindow(): void {
  const window = new BrowserWindow(getWindowOptions());

  setupWindowOpenHandler(window.webContents);

  if (isDev && WEBUI_URL) {
    window.loadURL(WEBUI_URL);
    window.webContents.openDevTools();
  } else {
    window.loadURL(`${RENDERER_SCHEME}://${RENDERER_HOST}${BASE_HREF}`);
  }
}

function getTargetWindow(): BrowserWindow | null {
  return (
    BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
  );
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  registerAsProtocolClient();

  app.on("second-instance", (_event, argv) => {
    const protocolUrl = argv.find((arg) =>
      arg.startsWith(`${PROTOCOL_SCHEME}://`),
    );
    if (protocolUrl) {
      handleProtocolUrl(protocolUrl);
    }
    const targetWindow = getTargetWindow();
    if (targetWindow) {
      if (targetWindow.isMinimized()) targetWindow.restore();
      targetWindow.focus();
    }
  });

  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleProtocolUrl(url);
  });

  app.whenReady().then(() => {
    const rendererDir = getRendererDir();

    ipcMain.handle(
      "show-notification",
      (_event, notification: DesktopNotification) => {
        if (!Notification.isSupported()) return;

        shownNotifications.get(notification.tag)?.close();

        const nativeNotification = new Notification({
          title: notification.title,
          body: notification.body,
        });

        const forgetNotification = () => {
          if (shownNotifications.get(notification.tag) === nativeNotification) {
            shownNotifications.delete(notification.tag);
          }
        };

        shownNotifications.set(notification.tag, nativeNotification);
        nativeNotification.on("close", forgetNotification);
        nativeNotification.on("failed", forgetNotification);

        nativeNotification.on("click", () => {
          forgetNotification();

          const targetWindow = getTargetWindow();
          if (!targetWindow) {
            createWindow();
            return;
          }

          targetWindow.show();
          targetWindow.focus();
          if (notification.route) {
            targetWindow.webContents.send(
              "notification-click",
              notification.route,
            );
          }
        });

        nativeNotification.show();
      },
    );

    ipcMain.handle(
      "image-cache-write",
      async (_event, cachePath: string, data: Uint8Array) => {
        const filePath = resolveImageCachePath(cachePath);
        if (!filePath) throw new Error("Invalid image cache path");

        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, data);
      },
    );

    ipcMain.handle("image-cache-delete", async (_event, cachePath: string) => {
      const filePath = resolveImageCachePath(cachePath);
      if (!filePath) return;

      await fs.rm(filePath, { force: true });
    });

    protocol.handle(RENDERER_SCHEME, async (req) => {
      const url = new URL(req.url);

      if (url.host !== RENDERER_HOST) {
        return new Response("Not Found", { status: 404 });
      }

      const imageCacheFilePath = resolveImageCachePath(
        url.pathname.replace(/^\//, ""),
      );
      if (imageCacheFilePath) {
        try {
          await fs.access(imageCacheFilePath);
          return net.fetch(pathToFileURL(imageCacheFilePath).toString());
        } catch {
          return new Response("Not Found", { status: 404 });
        }
      }

      let pathname = decodeURIComponent(url.pathname);
      if (pathname.startsWith(BASE_HREF)) {
        pathname = pathname.slice(BASE_HREF.length);
      } else if (pathname === BASE_HREF.replace(/\/$/, "")) {
        pathname = "";
      } else {
        pathname = pathname.replace(/^\//, "");
      }
      if (pathname === "") pathname = "index.html";

      const resolved = path.resolve(rendererDir, pathname);
      const relative = path.relative(rendererDir, resolved);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        return new Response("Not Found", { status: 404 });
      }

      try {
        await fs.access(resolved);
        return net.fetch(pathToFileURL(resolved).toString());
      } catch {
        if (!path.extname(resolved)) {
          return net.fetch(
            pathToFileURL(path.join(rendererDir, "index.html")).toString(),
          );
        }
        return new Response("Not Found", { status: 404 });
      }
    });

    createWindow();

    if (app.isPackaged) {
      startUpdateChecker(getTargetWindow);
    }

    const protocolArg = process.argv.find((arg) =>
      arg.startsWith(`${PROTOCOL_SCHEME}://`),
    );
    if (protocolArg) {
      handleProtocolUrl(protocolArg);
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.setAppUserModelId("com.recipesage.desktop");
}
