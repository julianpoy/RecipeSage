/// <reference lib="webworker" />

"use strict";

declare let self: ServiceWorkerGlobalScope;

import * as Sentry from "@sentry/browser";

const SUPPRESSED_WORKBOX_ERROR_CODES = ["no-response"] as const;

const checkSuppressedError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;

  const name =
    "name" in error && typeof error.name === "string" ? error.name : undefined;
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : undefined;

  return SUPPRESSED_WORKBOX_ERROR_CODES.some(
    (code) => name === code || message?.startsWith(`${code} ::`),
  );
};

if (process.env.ENVIRONMENT !== "selfhost") {
  const hostname = self.location.hostname;

  let environment = process.env.ENVIRONMENT;
  if (environment === "production" && hostname.startsWith("beta.")) {
    // We don't do separate builds for beta/production, so hostname check is the best
    // approach
    environment = "beta";
  }

  Sentry.init({
    release: process.env.APP_VERSION,
    environment,
    dsn: "https://f6bf39d644968626a9d7207fe3ae58fd@o158500.ingest.us.sentry.io/4510138109853696",
    transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),

    tracesSampleRate: 1,
    beforeSend(event, hint) {
      if (checkSuppressedError(hint.originalException)) return null;
      return event;
    },
  });
}

import { registerRoute, NavigationRoute } from "workbox-routing";
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import type { WorkboxPlugin } from "workbox-core";
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { initializeApp } from "firebase/app";
import {
  getMessaging,
  isSupported as isMessagingSupported,
} from "firebase/messaging/sw";
import { SWMessageType } from "./app/utils/localDb/sendMessageToSW";
import { DebugStoreService } from "./app/services/debugStore.service";
import { BASE_CACHE_NAME, LANG_CACHE_NAME } from "./app/utils/swCacheNames";

const IS_DESKTOP = process.env.IS_DESKTOP === "true";

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

const MAX_OFFLINE_APP_AGE = 14; // Days
const MAX_LANGUAGE_AGE = 14; // Days
const INDEX_NETWORK_TIMEOUT_SECONDS = 1.5;

/**
 * We load the full response here to workaround this:
 * https://github.com/GoogleChromeLabs/sw-toolbox/issues/221
 */
const drainResponseBodyPlugin: WorkboxPlugin = {
  fetchDidSucceed: async ({ response }) => {
    if (!response.body) return response;

    await response.clone().arrayBuffer();

    return response;
  },
};

const indexStrategy = new NetworkFirst({
  cacheName: BASE_CACHE_NAME,
  networkTimeoutSeconds: INDEX_NETWORK_TIMEOUT_SECONDS,
  fetchOptions: {
    cache: "no-cache",
  },
  plugins: [
    drainResponseBodyPlugin,
    new ExpirationPlugin({
      maxAgeSeconds: 60 * 60 * 24 * MAX_OFFLINE_APP_AGE,
    }),
  ],
});

const langStrategy = new StaleWhileRevalidate({
  cacheName: LANG_CACHE_NAME,
  fetchOptions: {
    cache: "no-cache",
  },
  plugins: [
    new ExpirationPlugin({
      maxAgeSeconds: 60 * 60 * 24 * MAX_LANGUAGE_AGE,
      maxEntries: 25,
    }),
  ],
});

if (!IS_DESKTOP) {
  registerRoute(
    new NavigationRoute(
      (options) =>
        indexStrategy.handle({
          request: new Request("/app/index.html", { cache: "no-cache" }),
          event: options.event,
        }),
      { allowlist: [/^\/app(\/|$)/] },
    ),
  );
}

const astroStrategy = new StaleWhileRevalidate({
  cacheName: "astro-pages",
  plugins: [
    new ExpirationPlugin({
      maxAgeSeconds: 60 * 60 * 24 * MAX_OFFLINE_APP_AGE,
    }),
  ],
});

registerRoute(
  ({ url, request }) =>
    url.origin === self.location.origin &&
    request.mode === "navigate" &&
    !url.pathname.startsWith("/app/"),
  astroStrategy,
);

registerRoute(
  ({ url }) =>
    url.origin === self.location.origin &&
    (url.pathname === "/manifest.json" ||
      url.pathname === "/robots.txt" ||
      url.pathname === "/sitemap.xml"),
  astroStrategy,
);

registerRoute(
  ({ url }) =>
    url.origin === self.location.origin && url.pathname.startsWith("/_astro/"),
  new CacheFirst({ cacheName: "astro-assets" }),
);

clientsClaim();

self.addEventListener("install", async (event) => {
  if (!IS_DESKTOP) {
    event.waitUntil(
      caches
        .open(BASE_CACHE_NAME)
        .then((cache) =>
          cache.add(new Request("/app/index.html", { cache: "reload" })),
        )
        .catch((e) => {
          console.error(e);
        }),
    );

    const [, langWarmDone] = langStrategy.handleAll({
      request: new Request(
        `/app/assets/i18n/en-us.json?version=${process.env.APP_VERSION}`,
      ),
      event,
    });

    event.waitUntil(
      langWarmDone.catch((e) => {
        console.error(e);
      }),
    );
  }

  self.skipWaiting();
});

const debugStore = new DebugStoreService();

addEventListener("message", async (event) => {
  if (!event.data?.type) {
    console.error("Unexpected message without data|type", event);
    return;
  }

  switch (event.data.type) {
    case SWMessageType.GetDebugDump: {
      const responsePort = event.ports[0];
      if (!responsePort) {
        console.error("No response port for getDebugDump");
        return;
      }

      const debugDump = debugStore.createSWDebugDump();
      responsePort.postMessage(JSON.parse(JSON.stringify(debugDump)));

      break;
    }
    default: {
      console.warn("Unhandled SW message", event);
    }
  }
});

if (!IS_DESKTOP) {
  registerRoute(/\/app\/index\.html$/, indexStrategy);

  registerRoute(/\/app\/assets\/i18n\//, langStrategy);
}

// API calls should always fetch the newest if available. Fall back on cache for offline support.
// Limit the maxiumum age so that requests aren't too stale.
const MAX_OFFLINE_API_AGE = 60; // Days
registerRoute(
  /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))/,
  new NetworkFirst({
    cacheName: "api-cache",
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * MAX_OFFLINE_API_AGE,
      }),
    ],
  }),
);

// S3 assets don't share ID's so we can cache them indefinitely
// Limit the cache to a maximum number of entries so as not to consume too much storage
registerRoute(
  /https:\/\/chefbook-prod.*amazonaws\.com\//,
  new CacheFirst({
    cacheName: "s3-image-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        purgeOnQuotaError: true, // Clear the image cache if we exceed the browser cache limit
      }),
    ],
  }),
);

const initializeFirebase = async () => {
  const firebaseApp = initializeApp({
    appId: "1:1064631313987:android:b6ca7a14265a6a01",
    apiKey: "AIzaSyANy7PbiPae7dmi4yYockrlvQz3tEEIkL0",
    projectId: "chef-book",
    messagingSenderId: "1064631313987",
  });

  const isSupported = await isMessagingSupported();
  if (!isSupported) {
    console.log("Firebase cloud messaging is not supported");
    return;
  }

  getMessaging(firebaseApp);
};

initializeFirebase().catch((e) => {
  console.error(e);
});

console.log("Service worker mounted");
