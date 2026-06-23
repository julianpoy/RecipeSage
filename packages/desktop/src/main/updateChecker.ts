import {
  app,
  autoUpdater,
  dialog,
  net,
  shell,
  type BrowserWindow,
  type MessageBoxOptions,
} from "electron";

const S3_BASE = "https://static.recipesage.com/desktop";
const MANIFEST_URL = `${S3_BASE}/prod-versions.json`;
const DOWNLOAD_PAGE = "https://recipesage.com/download";
const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000;

interface VersionManifest {
  minimumVersion: string;
}

function compareSemver(a: string, b: string): number {
  const aParts = a.split("-")[0].split(".").map(Number);
  const bParts = b.split("-")[0].split(".").map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

async function fetchVersionManifest(): Promise<VersionManifest | null> {
  try {
    const response = await net.fetch(MANIFEST_URL);
    if (!response.ok) return null;
    const data = await response.json();
    const minimumVersion = data?.minimumVersion;
    if (typeof minimumVersion !== "string") return null;
    return { minimumVersion };
  } catch {
    return null;
  }
}

async function checkMinimumVersion(
  getWindow: () => BrowserWindow | null,
): Promise<boolean> {
  const manifest = await fetchVersionManifest();
  if (!manifest) return true;

  const currentVersion = app.getVersion();
  if (compareSemver(currentVersion, manifest.minimumVersion) >= 0) return true;

  const options: MessageBoxOptions = {
    type: "warning",
    title: "Update Required",
    message: `This version of RecipeSage (${currentVersion}) is no longer supported. Please download the latest version.`,
    buttons: ["Download Update", "Quit"],
    defaultId: 0,
  };

  const window = getWindow();
  const { response } = window
    ? await dialog.showMessageBox(window, options)
    : await dialog.showMessageBox(options);

  if (response === 0) {
    await shell.openExternal(DOWNLOAD_PAGE);
  }

  app.quit();
  return false;
}

function setupAutoUpdater(getWindow: () => BrowserWindow | null): void {
  if (process.platform === "darwin") {
    autoUpdater.setFeedURL({
      url: `${S3_BASE}/prod/darwin/${process.arch}/RELEASES.json`,
      serverType: "json",
    });
  } else if (process.platform === "win32") {
    autoUpdater.setFeedURL({
      url: `${S3_BASE}/prod/win32/x64`,
    });
  } else {
    return;
  }

  autoUpdater.on("error", () => undefined);

  autoUpdater.on(
    "update-downloaded",
    async (_event, _releaseNotes, releaseName) => {
      const options: MessageBoxOptions = {
        type: "info",
        title: "Update Available",
        message: releaseName
          ? `A new version of RecipeSage (${releaseName}) has been downloaded. Restart to apply the update.`
          : "A new version of RecipeSage has been downloaded. Restart to apply the update.",
        buttons: ["Restart Now", "Later"],
        defaultId: 0,
        cancelId: 1,
      };

      const window = getWindow();
      const { response } = window
        ? await dialog.showMessageBox(window, options)
        : await dialog.showMessageBox(options);

      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    },
  );

  autoUpdater.checkForUpdates();
  setInterval(() => autoUpdater.checkForUpdates(), UPDATE_CHECK_INTERVAL);
}

export function startUpdateChecker(
  getWindow: () => BrowserWindow | null,
): void {
  checkMinimumVersion(getWindow).then((ok) => {
    if (!ok) return;
    setupAutoUpdater(getWindow);
  });

  setInterval(() => checkMinimumVersion(getWindow), UPDATE_CHECK_INTERVAL);
}
