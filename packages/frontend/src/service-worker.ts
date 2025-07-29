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
    dsn: "https://48261723ca12448e9b44836dd82effe1@glitchtip.poyourow.com/3",
    transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),

    tracesSampleRate: 1,
  });
}

import { registerRoute } from "workbox-routing";
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { getLocalDb } from "./app/utils/localDb";
import { SearchManager } from "./app/utils/SearchManager";
import { SyncManager } from "./app/utils/SyncManager";
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import {
  registerGetRecipesRoute,
  registerGetRecipeRoute,
  registerSearchRecipesRoute,
  registerUpdateRecipeRoute,
  registerCreateRecipeRoute,
  registerRecipeMutationWildcardRoute,
  registerGetSimilarRecipesRoute,
  registerGetRecipesByTitleRoute,
  registerGetUniqueRecipeTitleRoute,
  registerGetRecipesByIdsRoute,
} from "./app/utils/serviceWorker/routes/recipes";
import {
  registerGetShoppingListsRoute,
  registerGetShoppingListRoute,
  registerGetShoppingListItemsRoute,
  registerShoppingListMutationWildcardRoute,
} from "./app/utils/serviceWorker/routes/shoppingLists";
import {
  registerGetMealPlansRoute,
  registerGetMealPlanRoute,
  registerGetMealPlanItemsRoute,
  registerMealPlanMutationWildcardRoute,
} from "./app/utils/serviceWorker/routes/mealPlans";
import { SW_BROADCAST_CHANNEL_NAME } from "./app/utils/SW_BROADCAST_CHANNEL_NAME";
import { registerGetAssistantMessagesRoute } from "./app/utils/serviceWorker/routes/assistant";
import {
  registerGetJobRoute,
  registerGetJobsRoute,
} from "./app/utils/serviceWorker/routes/jobs";
import {
  registerGetMeRoute,
  registerGetMyFriendsRoute,
  registerGetMyStatsRoute,
} from "./app/utils/serviceWorker/routes/users";

const RS_LOGO_URL = "https://recipesage.com/assets/imgs/logo_green.png";

const broadcastChannel = new BroadcastChannel(SW_BROADCAST_CHANNEL_NAME);

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

const BASE_CACHE_NAME = "base-asset-cache";
const LANG_CACHE_NAME = "language-cache";

clientsClaim();

self.addEventListener("install", async (event) => {
  const networkFirstPrecacheUrls = ["/", "/index.html"];
  event.waitUntil(
    caches
      .open(BASE_CACHE_NAME)
      .then((cache) => cache.addAll(networkFirstPrecacheUrls)),
  );

  const languagePrecacheUrls = [
    `/assets/i18n/en-us.json?version=${process.env.APP_VERSION}`,
  ];
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

const searchManagerP = getLocalDb().then(
  (localDb) => new SearchManager(localDb),
);
const syncManagerP = Promise.all([getLocalDb(), searchManagerP]).then(
  ([localDb, searchManager]) => new SyncManager(localDb, searchManager),
);
syncManagerP.then((syncManager) => {
  syncManager.syncAll();
});

broadcastChannel.addEventListener("message", async (event) => {
  if (event.data.type === "triggerFullSync") {
    const syncManager = await syncManagerP;
    await syncManager.syncAll();

    if (event.data.notification) {
      await self.registration.showNotification(event.data.notification.title, {
        tag: event.data.notification.tag || "syncCompleted",
        icon: RS_LOGO_URL,
        body: event.data.notification.body,
      });
    }

    return;
  }

  if (event.data.type === "triggerRecipeSyncById") {
    syncManagerP.then((syncManager) => {
      syncManager.syncRecipe(event.data.recipeId);
    });
  }
});

// Index should be cached networkFirst - this way, users will always get the newest application version
const MAX_OFFILE_APP_AGE = 30; // Days
registerRoute(
  /\/index\.html/,
  new NetworkFirst({
    cacheName: BASE_CACHE_NAME,
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * MAX_OFFILE_APP_AGE,
      }),
    ],
  }),
);

// Language files should always come from network first since they change frequently
const MAX_LANGUAGE_AGE = 30; // Days
registerRoute(
  /\/assets\/i18n\/.*/,
  new NetworkFirst({
    cacheName: LANG_CACHE_NAME,
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * MAX_LANGUAGE_AGE,
      }),
    ],
  }),
);

// Icons should be served cache first - they almost never change, and serving an old version is accepable
const MAX_SVG_ICON_AGE = 60; // Days
registerRoute(
  /\/svg\/.*\.svg/,
  new CacheFirst({
    cacheName: "svg-icon-cache",
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * MAX_SVG_ICON_AGE,
      }),
    ],
  }),
);

registerGetRecipesRoute();
registerGetRecipeRoute();
registerGetSimilarRecipesRoute();
registerGetRecipesByIdsRoute();
registerGetRecipesByTitleRoute();
registerGetUniqueRecipeTitleRoute();
registerSearchRecipesRoute(searchManagerP);
registerUpdateRecipeRoute(syncManagerP);
registerCreateRecipeRoute(syncManagerP);
registerRecipeMutationWildcardRoute(syncManagerP);

registerGetShoppingListsRoute();
registerGetShoppingListRoute();
registerGetShoppingListItemsRoute();
registerShoppingListMutationWildcardRoute(syncManagerP);

registerGetMealPlansRoute();
registerGetMealPlanRoute();
registerGetMealPlanItemsRoute();
registerMealPlanMutationWildcardRoute(syncManagerP);

registerGetAssistantMessagesRoute();

registerGetJobRoute();
registerGetJobsRoute();

registerGetMeRoute();
registerGetMyFriendsRoute();
registerGetMyStatsRoute();

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

// ==== FIREBASE MESSAGING ====

try {
  const firebaseApp = initializeApp({
    appId: "1:1064631313987:android:b6ca7a14265a6a01",
    apiKey: "AIzaSyANy7PbiPae7dmi4yYockrlvQz3tEEIkL0",
    projectId: "chef-book",
    messagingSenderId: "1064631313987",
  });

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
              `${self.registration.scope}#/recipe/${event.notification.data.recipeId}`,
            );
          } else if (event.notification.data?.otherUserId) {
            return self.clients.openWindow(
              `${self.registration.scope}#/messages/${event.notification.data.otherUserId}`,
            );
          } else {
            return self.clients.openWindow(self.registration.scope);
          }
        }),
    );
  });
} catch (e) {
  console.error(e);
}

console.log("Service worker mounted");
