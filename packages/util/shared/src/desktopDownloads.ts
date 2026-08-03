export const DESKTOP_DOWNLOAD_BASE =
  "https://static.recipesage.com/desktop/prod/";

export const DESKTOP_PLATFORMS = ["windows", "macos", "linux"] as const;

export type DesktopPlatform = (typeof DESKTOP_PLATFORMS)[number];

export const DESKTOP_PLATFORM_LABEL_KEYS: Record<DesktopPlatform, string> = {
  windows: "pages.downloadAndInstall.desktop.platform.windows",
  macos: "pages.downloadAndInstall.desktop.platform.macos",
  linux: "pages.downloadAndInstall.desktop.platform.linux",
};

export const DESKTOP_PLATFORM_BUTTON_LABEL_KEYS: Record<
  DesktopPlatform,
  string
> = {
  windows: "pages.downloadAndInstall.desktop.button.windows",
  macos: "pages.downloadAndInstall.desktop.button.macos",
  linux: "pages.downloadAndInstall.desktop.button.linux",
};

export interface DesktopDownload {
  file: string;
  labelKey: string;
}

export const DESKTOP_DOWNLOADS: Record<DesktopPlatform, DesktopDownload[]> = {
  windows: [
    {
      file: "RecipeSage-Setup.exe",
      labelKey: "pages.downloadAndInstall.desktop.file.windowsExe",
    },
  ],
  macos: [
    {
      file: "RecipeSage-arm64.dmg",
      labelKey: "pages.downloadAndInstall.desktop.file.macosArm",
    },
    {
      file: "RecipeSage-x64.dmg",
      labelKey: "pages.downloadAndInstall.desktop.file.macosIntel",
    },
  ],
  linux: [
    {
      file: "RecipeSage-linux-x86_64.AppImage",
      labelKey: "pages.downloadAndInstall.desktop.file.linuxAppImage",
    },
    {
      file: "RecipeSage-linux-amd64.deb",
      labelKey: "pages.downloadAndInstall.desktop.file.linuxDeb",
    },
    {
      file: "RecipeSage-linux-x86_64.rpm",
      labelKey: "pages.downloadAndInstall.desktop.file.linuxRpm",
    },
    {
      file: "RecipeSage-linux-x64.zip",
      labelKey: "pages.downloadAndInstall.desktop.file.linuxZip",
    },
  ],
};

export const DESKTOP_RECOMMENDED_DOWNLOADS: Record<
  DesktopPlatform,
  DesktopDownload
> = {
  windows: DESKTOP_DOWNLOADS.windows[0],
  macos: DESKTOP_DOWNLOADS.macos[0],
  linux: DESKTOP_DOWNLOADS.linux[0],
};

export const getDesktopDownloadUrl = (file: string): string =>
  `${DESKTOP_DOWNLOAD_BASE}${file}`;

export const detectDesktopPlatform = (
  userAgent: string,
): DesktopPlatform | undefined => {
  if (/Android|iPhone|iPad|iPod|CrOS/.test(userAgent)) return undefined;
  if (/Windows/.test(userAgent)) return "windows";
  if (/Mac OS X|Macintosh/.test(userAgent)) return "macos";
  if (/Linux|X11/.test(userAgent)) return "linux";
  return undefined;
};
