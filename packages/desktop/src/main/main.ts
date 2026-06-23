import { app, BrowserWindow, net, protocol, shell } from "electron";
import path from "path";
import fs from "fs/promises";
import { pathToFileURL } from "url";
import squirrelStartup from "electron-squirrel-startup";
import { startUpdateChecker } from "./updateChecker";

if (squirrelStartup) app.quit();

declare const process: NodeJS.Process & { resourcesPath: string };

const isDev = process.env.NODE_ENV === "development";
const WEBUI_URL = process.env.WEBUI_URL;
if (isDev && !WEBUI_URL) throw new Error("WEBUI_URL must be provided");

const RENDERER_HOST = "desktop-vhost.recipesage.com";
const PROTOCOL_SCHEME = "recipesage";
const BASE_HREF = "/app/";

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

function getRendererDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "renderer");
  }
  return path.join(app.getAppPath(), "renderer");
}

function handleProtocolUrl(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${PROTOCOL_SCHEME}:`) return;
    if (parsed.hostname !== "auth") return;

    const code = parsed.searchParams.get("code");
    if (!code) return;

    mainWindow?.webContents.send("auth-code", code);
    mainWindow?.focus();
  } catch {
    // Ignore malformed URLs
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "RecipeSage",
    autoHideMenuBar: true,
    titleBarStyle: "default",
    icon: app.isPackaged
      ? path.join(process.resourcesPath, "icons", "recipesage.png")
      : path.join(__dirname, "../../icons/recipesage.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  if (isDev && WEBUI_URL) {
    mainWindow.loadURL(WEBUI_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`https://${RENDERER_HOST}${BASE_HREF}`);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("second-instance", (_event, argv) => {
  const protocolUrl = argv.find((arg) =>
    arg.startsWith(`${PROTOCOL_SCHEME}://`),
  );
  if (protocolUrl) {
    handleProtocolUrl(protocolUrl);
  }
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

app.whenReady().then(() => {
  const rendererDir = getRendererDir();

  protocol.handle("https", async (req) => {
    const url = new URL(req.url);

    if (url.host !== RENDERER_HOST) {
      return net.fetch(req, { bypassCustomProtocolHandlers: true });
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
    startUpdateChecker(() => mainWindow);
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
