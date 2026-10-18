import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import {
  BookmarkIcon,
  ChevronRightIcon,
  CloudDownloadIcon,
  DownloadIcon,
  MonitorIcon,
  PuzzleIcon,
  ShareIcon,
} from "lucide-react";
import {
  DESKTOP_DOWNLOADS,
  DESKTOP_PLATFORMS,
  DESKTOP_RECOMMENDED_DOWNLOADS,
  detectDesktopPlatform,
  getDesktopDownloadUrl,
  type DesktopPlatform,
} from "@recipesage/util/shared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { IS_DESKTOP } from "../../../environments/environment";
import { PageHeader } from "../../../components/layout/PageHeader";
import { PageContent } from "../../../components/layout/PageContent";
import { CopyWithWebshare } from "../../../components/copy-with-webshare/CopyWithWebshare";
import type { TranslationKey } from "../../../i18n/TranslationKey";
import {
  clearInstallPrompt,
  getInstallPrompt,
} from "../../../utils/pwaInstallPrompt";
import { PlatformLogo, type PlatformLogoName } from "./PlatformLogo";

const DOWNLOAD_PAGE_URL = "https://recipesage.com/download";

const BOOKMARKLET_HREF =
  "javascript:(function(){location.href='https://recipesage.com/app/edit-recipe/new?autofill-url='+encodeURIComponent(location.href);})();";

const PLATFORM_LABEL_KEYS: Record<DesktopPlatform, TranslationKey> = {
  windows: "pages.downloadAndInstall.desktop.platform.windows",
  macos: "pages.downloadAndInstall.desktop.platform.macos",
  linux: "pages.downloadAndInstall.desktop.platform.linux",
};

const PLATFORM_BUTTON_LABEL_KEYS: Record<DesktopPlatform, TranslationKey> = {
  windows: "pages.downloadAndInstall.desktop.button.windows",
  macos: "pages.downloadAndInstall.desktop.button.macos",
  linux: "pages.downloadAndInstall.desktop.button.linux",
};

const DOWNLOAD_FILE_LABEL_KEYS: Record<string, TranslationKey | undefined> = {
  "RecipeSage-Setup.exe": "pages.downloadAndInstall.desktop.file.windowsExe",
  "RecipeSage-arm64.dmg": "pages.downloadAndInstall.desktop.file.macosArm",
  "RecipeSage-x64.dmg": "pages.downloadAndInstall.desktop.file.macosIntel",
  "RecipeSage-linux-x86_64.AppImage":
    "pages.downloadAndInstall.desktop.file.linuxAppImage",
  "RecipeSage-linux-amd64.deb":
    "pages.downloadAndInstall.desktop.file.linuxDeb",
  "RecipeSage-linux-x86_64.rpm":
    "pages.downloadAndInstall.desktop.file.linuxRpm",
  "RecipeSage-linux-x64.zip": "pages.downloadAndInstall.desktop.file.linuxZip",
};

const PLATFORM_ICONS: Record<DesktopPlatform, PlatformLogoName> = {
  windows: "windows",
  macos: "apple",
  linux: "tux",
};

const isNativeOrDesktopApp = Capacitor.isNativePlatform() || IS_DESKTOP;
const recommendedPlatform = detectDesktopPlatform(navigator.userAgent);

const PILL_LINK_CLASSES =
  "inline-flex min-h-10 items-center rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary no-underline! hover:bg-primary/10 hover:text-primary!";

const SECTION_LABEL_CLASSES =
  "text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase";

export const DownloadAndInstallPage = () => {
  const { t } = useTranslation();
  const [pwaPromptAvailable, setPwaPromptAvailable] = useState(
    () => !!getInstallPrompt(),
  );

  useEffect(() => {
    const onInstallPrompt = () => setPwaPromptAvailable(true);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
  }, []);

  const showPWAPrompt = async () => {
    const installPrompt = getInstallPrompt();
    if (!installPrompt) return;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === "accepted") {
      clearInstallPrompt();
      setPwaPromptAvailable(false);
    }
  };

  const platformTrigger = (icon: ReactNode, label: string) => (
    <AccordionTrigger className="min-h-14 items-center px-4 py-3 text-base font-semibold hover:no-underline">
      <span className="flex items-center gap-3.5">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </span>
    </AccordionTrigger>
  );

  return (
    <>
      <PageHeader title={t("pages.downloadAndInstall.title")} />
      <PageContent className="pb-[25vh]">
        <div className="mx-auto max-w-content">
          {isNativeOrDesktopApp ? (
            <>
              <p className="mb-4 text-[0.92rem] leading-normal text-muted-foreground">
                {t("pages.downloadAndInstall.otherDevices.description")}
              </p>
              <CopyWithWebshare
                webshareTitle={t(
                  "pages.downloadAndInstall.otherDevices.shareTitle",
                )}
                webshareURL={DOWNLOAD_PAGE_URL}
                copyText={DOWNLOAD_PAGE_URL}
              />
            </>
          ) : (
            <>
              <p className="mb-4 text-[0.92rem] leading-normal text-muted-foreground">
                {t("pages.downloadAndInstall.subtitle")}
              </p>

              {pwaPromptAvailable && (
                <button
                  type="button"
                  className="mb-4 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-primary bg-primary/10 px-4 py-3.5 text-start hover:bg-primary/15"
                  onClick={() => void showPWAPrompt()}
                >
                  <CloudDownloadIcon
                    aria-hidden="true"
                    className="size-6 shrink-0 text-primary"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[0.95rem] font-semibold">
                      {t("pages.downloadAndInstall.thisDevice")}
                    </span>
                    <span className="text-[0.78rem] leading-snug text-muted-foreground">
                      {t("pages.downloadAndInstall.done")}
                    </span>
                  </span>
                  <ChevronRightIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
                  />
                </button>
              )}

              <Accordion className="gap-2.5 overflow-visible rounded-none border-0">
                <AccordionItem
                  value="android"
                  className="overflow-hidden rounded-xl border bg-card not-last:border-b data-open:bg-card"
                >
                  {platformTrigger(
                    <PlatformLogo name="android" />,
                    t("pages.downloadAndInstall.android.title"),
                  )}
                  <AccordionContent>
                    <p className="text-[0.85rem] leading-normal text-muted-foreground">
                      {t("pages.downloadAndInstall.android.description")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        className={PILL_LINK_CLASSES}
                        href="https://play.google.com/store/apps/details?id=com.recipesage.app"
                        target="_blank"
                        rel="noopener"
                      >
                        {t("pages.downloadAndInstall.android.install")}
                      </a>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="ios"
                  className="overflow-hidden rounded-xl border bg-card not-last:border-b data-open:bg-card"
                >
                  {platformTrigger(
                    <PlatformLogo name="apple" />,
                    t("pages.downloadAndInstall.ios.title"),
                  )}
                  <AccordionContent>
                    <p className="text-[0.85rem] leading-normal text-muted-foreground">
                      {t("pages.downloadAndInstall.ios.instructionHeader")}
                    </p>
                    <ol className="flex flex-col gap-3">
                      {[
                        t("pages.downloadAndInstall.ios.step.1"),
                        t("pages.downloadAndInstall.ios.step.2"),
                        t("pages.downloadAndInstall.ios.step.3"),
                      ].map((step, idx) => (
                        <li
                          key={idx}
                          className="relative ps-[34px] text-[0.88rem] leading-normal"
                        >
                          <span
                            aria-hidden="true"
                            className="absolute start-0 top-0 flex size-[22px] items-center justify-center rounded-full bg-primary text-[0.72rem] font-bold text-primary-foreground tabular-nums"
                          >
                            {idx + 1}
                          </span>
                          {step}
                          {idx === 1 && (
                            <span
                              role="img"
                              aria-label={t(
                                "pages.downloadAndInstall.icon.share",
                              )}
                              className="ms-1 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-muted px-1 align-middle"
                            >
                              <ShareIcon
                                aria-hidden="true"
                                className="size-4"
                              />
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                    <p className="mt-3.5 text-[0.78rem] leading-snug text-muted-foreground">
                      {t("pages.downloadAndInstall.done")}
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="desktop"
                  className="overflow-hidden rounded-xl border bg-card not-last:border-b data-open:bg-card"
                >
                  {platformTrigger(
                    <MonitorIcon aria-hidden="true" className="size-5" />,
                    t("pages.downloadAndInstall.desktop.title"),
                  )}
                  <AccordionContent>
                    <p className="text-[0.85rem] leading-normal text-muted-foreground">
                      {t("pages.downloadAndInstall.desktop.description")}
                    </p>

                    {recommendedPlatform && (
                      <a
                        className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-[0.9rem] font-semibold text-primary-foreground no-underline! hover:bg-primary/85 hover:text-primary-foreground!"
                        href={getDesktopDownloadUrl(
                          DESKTOP_RECOMMENDED_DOWNLOADS[recommendedPlatform]
                            .file,
                        )}
                        target="_blank"
                        rel="noopener"
                      >
                        <PlatformLogo
                          name={PLATFORM_ICONS[recommendedPlatform]}
                        />
                        {t(PLATFORM_BUTTON_LABEL_KEYS[recommendedPlatform])}
                      </a>
                    )}

                    <p className={cn("mt-5 mb-3", SECTION_LABEL_CLASSES)}>
                      {t("pages.downloadAndInstall.desktop.allDownloads")}
                    </p>

                    <div className="flex flex-col gap-4">
                      {DESKTOP_PLATFORMS.map((platform) => (
                        <div key={platform}>
                          <h3 className="mb-2 flex items-center gap-2 text-[0.85rem] font-semibold text-foreground">
                            <PlatformLogo
                              name={PLATFORM_ICONS[platform]}
                              className="size-4 text-muted-foreground"
                            />
                            {t(PLATFORM_LABEL_KEYS[platform])}
                          </h3>
                          <div className="flex flex-col gap-1.5">
                            {DESKTOP_DOWNLOADS[platform].map((download) => {
                              const labelKey =
                                DOWNLOAD_FILE_LABEL_KEYS[download.file];
                              return (
                                <a
                                  key={download.file}
                                  className="flex min-h-10 items-center justify-between gap-2.5 rounded-lg border px-3 py-2.5 text-[0.85rem] text-foreground no-underline! hover:border-primary hover:bg-muted hover:text-foreground!"
                                  href={getDesktopDownloadUrl(download.file)}
                                  target="_blank"
                                  rel="noopener"
                                >
                                  <span>
                                    {labelKey ? t(labelKey) : download.file}
                                  </span>
                                  <DownloadIcon
                                    aria-hidden="true"
                                    className="size-4 shrink-0 text-muted-foreground"
                                  />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <h2 className={cn("mt-7 mb-2.5", SECTION_LABEL_CLASSES)}>
                {t("pages.downloadAndInstall.other")}
              </h2>

              <div className="mb-2.5 rounded-xl border bg-card p-4">
                <div className="mb-2 flex items-center gap-2.5">
                  <PuzzleIcon
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground"
                  />
                  <h3 className="text-[0.95rem] font-semibold">
                    {t("pages.downloadAndInstall.extension")}
                  </h3>
                </div>
                <p className="text-[0.85rem] leading-normal text-muted-foreground">
                  {t("pages.downloadAndInstall.extension.description")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    className={PILL_LINK_CLASSES}
                    href="https://addons.mozilla.org/en-US/firefox/addon/recipesage/"
                    target="_blank"
                    rel="noopener"
                  >
                    {t("pages.downloadAndInstall.extension.installFirefox")}
                  </a>
                  <a
                    className={PILL_LINK_CLASSES}
                    href="https://chrome.google.com/webstore/detail/oepplnnfceidfaaacjpdpobnjkcpgcpo"
                    target="_blank"
                    rel="noopener"
                  >
                    {t("pages.downloadAndInstall.extension.installChrome")}
                  </a>
                </div>
              </div>

              <div className="mb-2.5 rounded-xl border bg-card p-4">
                <div className="mb-2 flex items-center gap-2.5">
                  <BookmarkIcon
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground"
                  />
                  <h3 className="text-[0.95rem] font-semibold">
                    {t("pages.downloadAndInstall.bookmark")}
                  </h3>
                </div>
                <p className="text-[0.85rem] leading-normal text-muted-foreground">
                  {t("pages.downloadAndInstall.bookmark.description")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    ref={(element) => {
                      element?.setAttribute("href", BOOKMARKLET_HREF);
                    }}
                    className={cn(PILL_LINK_CLASSES, "cursor-grab")}
                    title={t("pages.downloadAndInstall.bookmark.linkTitle")}
                    onClick={(event) => event.preventDefault()}
                  >
                    {t("pages.downloadAndInstall.bookmark.instructions")}
                  </a>
                </div>
                <p className="mt-2.5 text-[0.78rem] leading-snug text-muted-foreground">
                  {t("pages.downloadAndInstall.bookmark.usage")}
                </p>
              </div>
            </>
          )}
        </div>
      </PageContent>
    </>
  );
};
