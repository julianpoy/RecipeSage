"use strict";

const APP_VERSION = "development";

importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js"
);

const { precaching, routing, strategies, expiration } = workbox;

const { precacheAndRoute } = precaching;
const { registerRoute } = routing;
const { NetworkFirst, CacheFirst } = strategies;
const { ExpirationPlugin } = expiration;

precacheAndRoute(self.__WB_MANIFEST || []);

const BASE_CACHE_NAME = "base-asset-cache";
const LANG_CACHE_NAME = "language-cache";

self.addEventListener("install", async (event) => {
  const networkFirstPrecacheUrls = ["/", "/index.html"];
  event.waitUntil(
    caches
      .open(BASE_CACHE_NAME)
      .then((cache) => cache.addAll(networkFirstPrecacheUrls))
  );

  const languagePrecacheUrls = [
    `/assets/i18n/en-us.json?version=${APP_VERSION}`,
  ];
  event.waitUntil(
    caches
      .delete(LANG_CACHE_NAME)
      .then(() =>
        caches
          .open(LANG_CACHE_NAME)
          .then((cache) => cache.addAll(languagePrecacheUrls))
      )
  );
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
  })
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
  })
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
  })
);

// API calls should always fetch the newest if available. Fall back on cache for offline support.
// Limit the maxiumum age so that requests aren't too stale.
const MAX_OFFLINE_API_AGE = 60; // Days
registerRoute(
  /https:\/\/api\(\.beta)?.recipesage\.com/,
  new NetworkFirst({
    cacheName: "api-cache",
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * MAX_OFFLINE_API_AGE,
      }),
    ],
  })
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
  })
);

// ==== FIREBASE MESSAGING ====

try {
  const RS_LOGO_URL = "https://recipesage.com/assets/imgs/logo_green.png";

  importScripts("https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js");
  importScripts(
    "https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js"
  );

  firebase.initializeApp({
    appId: "1:1064631313987:android:b6ca7a14265a6a01",
    apiKey: "AIzaSyANy7PbiPae7dmi4yYockrlvQz3tEEIkL0",
    projectId: "chef-book",
    messagingSenderId: "1064631313987",
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((message) => {
    console.log("Received background message ", message);

    var notificationTitle = {};
    var notificationOptions = {};

    switch (message.data.type) {
      case "update:available":
        return self.registration.update();
      case "messages:new":
        var messageObj = JSON.parse(message.data.message);

        notificationTitle =
          messageObj.otherUser.name || messageObj.otherUser.email;

        notificationOptions.body = messageObj.body;
        if (messageObj.recipe) {
          notificationOptions.body =
            "Shared a recipe with you: " + messageObj.recipe.title;
          notificationOptions.icon = messageObj.recipe.images[0].location;
        }
        notificationOptions.icon = notificationOptions.icon || RS_LOGO_URL;

        notificationOptions.click_action =
          self.registration.scope + "#/messages/" + messageObj.otherUser.id;
        notificationOptions.data = {
          type: message.data.type,
          otherUserId: messageObj.otherUser.id,
        };
        notificationOptions.tag =
          message.data.type + "-" + messageObj.otherUser.id;
        break;
    }

    return self.registration.showNotification(
      notificationTitle,
      notificationOptions
    );
  });

  self.addEventListener("notificationclick", (event) => {
    console.log("On notification click: ", event.notification);
    // Android doesn't close the notification when you click on it
    // See: http://crbug.com/463146
    event.notification.close();

    // This looks to see if the current is already open and
    // focuses if it is
    event.waitUntil(
      clients
        .matchAll({
          type: "window",
        })
        .then(function (clientList) {
          for (var i = 0; i < clientList.length; i++) {
            var client = clientList[i];
            if (client.url == "/" && "focus" in client) return client.focus();
          }
          if (clients.openWindow) {
            if (event.notification.data.recipeId) {
              return clients.openWindow(
                self.registration.scope +
                  "#/recipe/" +
                  event.notification.data.recipeId
              );
            } else if (event.notification.data.otherUserId) {
              return clients.openWindow(
                self.registration.scope +
                  "#/messages/" +
                  event.notification.data.otherUserId
              );
            } else {
              return clients.openWindow(self.registration.scope);
            }
          }
        })
    );
  });
} catch (e) {
  // Firebase not supported, silence errors
}

console.log("Service worker mounted");
