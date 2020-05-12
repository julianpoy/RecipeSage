'use strict';

importScripts('workbox-src/workbox-sw.js');
/* global workbox */
workbox.setConfig({
  debug: false,
  modulePathPrefix: 'workbox-src/'
});
workbox.precaching.precacheAndRoute([]);

// Index should be cached networkFirst - this way, users will always get the newest application version
const MAX_OFFILE_APP_AGE = 30; // Days
workbox.routing.registerRoute(
  new RegExp('/index\.html'),
  workbox.strategies.networkFirst({
    cacheName: 'base-asset-cache',
    plugins: [
      new workbox.expiration.Plugin({
        maxAgeSeconds: 60 * 60 * 24 * MAX_OFFILE_APP_AGE,
      }),
    ]
  })
);

// Icons should be served cache first - they almost never change, and serving an old version is accepable
const MAX_SVG_ICON_AGE = 60; // Days
workbox.routing.registerRoute(
  new RegExp('/svg/.*\.svg'),
  workbox.strategies.cacheFirst({
    cacheName: 'svg-icon-cache',
    plugins: [
      new workbox.expiration.Plugin({
        maxAgeSeconds: 60 * 60 * 24 * MAX_SVG_ICON_AGE,
      }),
    ]
  })
);

// API calls should always fetch the newest if available. Fall back on cache for offline support.
// Limit the maxiumum age so that requests aren't too stale.
const MAX_OFFLINE_API_AGE = 30; // Days
workbox.routing.registerRoute(
  new RegExp('/api/'),
  workbox.strategies.networkFirst({
    cacheName: 'api-cache',
    plugins: [
      new workbox.expiration.Plugin({
        maxAgeSeconds: 60 * 60 * 24 * MAX_OFFLINE_API_AGE,
      }),
    ]
  })
);

// S3 assets don't share ID's so we can cache them indefinitely
// Limit the cache to a maximum number of entries so as not to consume too much storage
workbox.routing.registerRoute(
  /chefbook.*prod.*s3.*amazonaws/,
  workbox.strategies.cacheFirst({
    cacheName: 's3-image-cache',
    plugins: [
      new workbox.expiration.Plugin({
        maxEntries: 200,
        purgeOnQuotaError: true // Clear the image cache if we exceed the browser cache limit
      }),
    ],
  })
);

// ==== FIREBASE MESSAGING ====

const RS_LOGO_URL = 'https://recipesage.com/assets/imgs/logo_green.png';

importScripts('https://www.gstatic.com/firebasejs/3.5.2/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/3.5.2/firebase-messaging.js');

firebase.initializeApp({
  'messagingSenderId': '1064631313987'
});

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(function(message) {
  console.log('Received background message ', message);

  var notificationTitle = {};
  var notificationOptions = {};

  switch(message.data.type) {
    case 'update:available':
      return self.registration.update();
    case 'messages:new':
      var messageObj = JSON.parse(message.data.message);

      notificationTitle = (messageObj.otherUser.name || messageObj.otherUser.email);

      notificationOptions.body = messageObj.body;
      if (messageObj.recipe) {
        notificationOptions.body = 'Shared a recipe with you: ' + messageObj.recipe.title;
        notificationOptions.icon = messageObj.recipe.images[0].location;
      }
      notificationOptions.icon = notificationOptions.icon || RS_LOGO_URL;

      notificationOptions.click_action = self.registration.scope + '#/messages/' + messageObj.otherUser.id;
      notificationOptions.data = {
        type: message.data.type,
        otherUserId: messageObj.otherUser.id
      };
      notificationOptions.tag = message.data.type + '-' + messageObj.otherUser.id;
      break;
  }

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  console.log('On notification click: ', event.notification);
  // Android doesn't close the notification when you click on it
  // See: http://crbug.com/463146
  event.notification.close();

  // This looks to see if the current is already open and
  // focuses if it is
  event.waitUntil(
    clients.matchAll({
      type: "window"
    }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url == '/' && 'focus' in client)
          return client.focus();
      }
      if (clients.openWindow) {
        if (event.notification.data.recipeId) {
          return clients.openWindow(self.registration.scope + '#/recipe/' + event.notification.data.recipeId);
        } else if (event.notification.data.otherUserId) {
          return clients.openWindow(self.registration.scope + '#/messages/' + event.notification.data.otherUserId);
        } else {
          return clients.openWindow(self.registration.scope);
        }
      }
    })
  );
});

console.log("Service worker mounted");
