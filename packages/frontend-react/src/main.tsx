import "./index.css";
import "./services/debugStore";
import "./services/offlineModeService";
import "./stores/capabilitiesStore";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { ENABLE_ANALYTICS } from "./environments/environment";
import { initI18n } from "./i18n/i18n";
import { router } from "./routes/router";
import { sentryInit } from "./sentryInit";
import { deepLinkService } from "./services/deepLinkService";
import { messagingService } from "./services/messagingService";
import { nativePrintTutorialService } from "./services/nativePrintTutorialService";
import { queryClient } from "./services/queryClient";
import { shareReceiverService } from "./services/shareReceiverService";
import { versionCheckService } from "./services/versionCheckService";
import {
  getPreferredLanguage,
  initPreferenceEffects,
} from "./stores/initPreferenceEffects";
import { preferencesStore } from "./stores/preferencesStore";
import { analytics } from "./utils/analytics";
import { appIdbStorageManager } from "./utils/appIdbStorageManager";
import { session } from "./utils/session";

const boot = async () => {
  sentryInit(router);

  initPreferenceEffects();

  if (ENABLE_ANALYTICS) {
    analytics.init();
  }

  await initI18n(getPreferredLanguage(preferencesStore.getState().preferences));

  void preferencesStore.getState().loadRemote();

  deepLinkService.init();
  nativePrintTutorialService.init();
  shareReceiverService.init();
  void versionCheckService.checkVersion();

  if (
    "Notification" in window &&
    Notification.permission === "granted" &&
    session.isLoggedIn()
  ) {
    void messagingService.requestNotifications();
  }

  appIdbStorageManager.restoreSessionFromToken().catch((e) => {
    Sentry.captureException(e);
  });

  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element not found");

  createRoot(rootElement, {
    onUncaughtError: Sentry.reactErrorHandler(),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
  }).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
};

boot().catch((err) => {
  console.error(err);
  Sentry.captureException(err);
});
