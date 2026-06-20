/// <reference lib="webworker" />

"use strict";

declare let self: ServiceWorkerGlobalScope;

import * as Sentry from "@sentry/browser";

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
    environment: process.env.ENVIRONMENT,
    dsn: "https://f6bf39d644968626a9d7207fe3ae58fd@o158500.ingest.us.sentry.io/4510138109853696",
    transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),

    tracesSampleRate: 1,
  });
}

import { registerRoute, NavigationRoute } from "workbox-routing";
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { initializeApp } from "firebase/app";
import {
  getMessaging,
  onBackgroundMessage,
  isSupported as isMessagingSupported,
} from "firebase/messaging/sw";
import { SWMessageType } from "./app/utils/localDb/sendMessageToSW";
import { DebugStoreService } from "./app/services/debugStore.service";

const RS_LOGO_URL = "https://recipesage.com/assets/imgs/logo_green.png";

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

const BASE_CACHE_NAME = "base-asset-cache";
const LANG_CACHE_NAME = "language-cache";
const MAX_OFFLINE_APP_AGE = 30; // Days

const indexNetworkFirstStrategy = new NetworkFirst({
  cacheName: BASE_CACHE_NAME,
  plugins: [
    new ExpirationPlugin({
      maxAgeSeconds: 60 * 60 * 24 * MAX_OFFLINE_APP_AGE,
    }),
  ],
});

registerRoute(
  new NavigationRoute(
    (options) =>
      indexNetworkFirstStrategy.handle({
        request: new Request("/app/index.html"),
        event: options.event,
      }),
    { allowlist: [/^\/app(\/|$)/] },
  ),
);

const astroNetworkFirstStrategy = new NetworkFirst({
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
  astroNetworkFirstStrategy,
);

registerRoute(
  ({ url }) =>
    url.origin === self.location.origin &&
    (url.pathname === "/manifest.json" ||
      url.pathname === "/robots.txt" ||
      url.pathname === "/sitemap.xml"),
  astroNetworkFirstStrategy,
);

registerRoute(
  ({ url }) =>
    url.origin === self.location.origin && url.pathname.startsWith("/_astro/"),
  new CacheFirst({ cacheName: "astro-assets" }),
);

clientsClaim();

self.addEventListener("install", async (event) => {
  const networkFirstPrecacheUrls = ["/app/index.html"];
  event.waitUntil(
    caches
      .open(BASE_CACHE_NAME)
      .then((cache) => cache.addAll(networkFirstPrecacheUrls)),
  );

  const languagePrecacheUrls = [`/app/assets/i18n/en-us.json`];
  event.waitUntil(
    caches
      .delete(LANG_CACHE_NAME)
      .then(() =>
        caches
          .open(LANG_CACHE_NAME)
          .then((cache) => cache.addAll(languagePrecacheUrls)),
      ),
  );

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

registerRoute(/\/app\/index\.html$/, indexNetworkFirstStrategy);

// Language files should always come from network first since they change frequently
const MAX_LANGUAGE_AGE = 30; // Days
registerRoute(
  /\/app\/assets\/i18n\//,
  new NetworkFirst({
    cacheName: LANG_CACHE_NAME,
    matchOptions: { ignoreSearch: true },
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * MAX_LANGUAGE_AGE,
      }),
    ],
  }),
);

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

  const messaging = getMessaging(firebaseApp);

  onBackgroundMessage(messaging, (message) => {
    console.log("Received background message ", message);

    switch (message.data?.type) {
      case "update:available": {
        return self.registration.update();
      }
      case "messages:new": {
        const messageObj = JSON.parse(message.data.message);

        return self.registration.showNotification(messageObj.otherUser.name, {
          tag: message.data.type + "-" + messageObj.otherUser.id,
          icon: messageObj.recipe?.images.at(0)?.location || RS_LOGO_URL,
          body: messageObj.recipe ? messageObj.recipe.title : messageObj.body,
          data: {
            type: message.data.type,
            otherUserId: messageObj.otherUser.id,
          },
        });
      }
    }
  });

  self.addEventListener("notificationclick", (event: any) => {
    // Android doesn't close the notification when you click on it
    // See: http://crbug.com/463146
    event.notification.close();

    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
        })
        .then((clientList) => {
          for (const client of clientList) {
            // This looks to see if the app is already open at the root page and focuses if it is
            if (client.url == "/") {
              return client.focus();
            }
          }
          if (event.notification.data?.recipeId) {
            return self.clients.openWindow(
              `${self.registration.scope}app/recipe/${event.notification.data.recipeId}`,
            );
          } else if (event.notification.data?.otherUserId) {
            return self.clients.openWindow(
              `${self.registration.scope}app/messages/${event.notification.data.otherUserId}`,
            );
          } else {
            return self.clients.openWindow(`${self.registration.scope}app/`);
          }
        }),
    );
  });
};

initializeFirebase().catch((e) => {
  console.error(e);
});

console.log("Service worker mounted");
