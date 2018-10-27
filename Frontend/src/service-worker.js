'use strict';

importScripts('workbox-3.2.0/workbox-sw.js');
/* global workbox */
workbox.setConfig({
  debug: false,
  modulePathPrefix: 'workbox-3.2.0/'
});
workbox.skipWaiting();
workbox.clientsClaim();
workbox.precaching.precacheAndRoute([]);
workbox.precaching.precacheAndRoute([
  {
    "url": "assets/fonts/ionicons.woff2?v=4.1.1",
    "revision": '383676'
  },
  {
    "url": "https://cdnjs.cloudflare.com/ajax/libs/jQuery-linkify/2.1.6/linkify.min.js"
  },
  {
    "url": "https://cdnjs.cloudflare.com/ajax/libs/jQuery-linkify/2.1.6/linkify-string.min.js"
  },
  {
    "url": "https://cdnjs.cloudflare.com/ajax/libs/lunr.js/2.1.6/lunr.min.js"
  }
]);

// API calls should always fetch the newest if available. Fall back on cache for offline support.
// Limit the maxiumum age so that requests aren't too stale.
workbox.routing.registerRoute(
  new RegExp('/api/'),
  workbox.strategies.networkFirst({
    cacheName: 'api-cache',
    plugins: [
      new workbox.expiration.Plugin({
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 Days, equal to our session invalidation
      }),
    ]
  })
);

// S3 assets don't share ID's so we can cache them indefinitely
// Limit the cache to a maximum number of entries so as not to consume too much storage
workbox.routing.registerRoute(
  new RegExp('https://chefbook-prod\.s3\.amazonaws\.com/|https://chefbook-prod\.s3\.us-west-2\.amazonaws\.com/'),
  workbox.strategies.cacheFirst({
    cacheName: 's3-image-cache',
    plugins: [
      new workbox.expiration.Plugin({
        maxEntries: 40
      }),
    ],
  })
);

// ==== FIREBASE MESSAGING ====

importScripts('https://www.gstatic.com/firebasejs/3.5.2/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/3.5.2/firebase-messaging.js');

firebase.initializeApp({
  // get this from Firebase console, Cloud messaging section
  'messagingSenderId': '1064631313987'
});

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(function(message) {
  console.log('Received background message ', message);
  // here you can override some options describing what's in the message;
  // however, the actual content will come from the Webtask
  var notificationOptions = {};

  switch(message.data.type) {
    case 'messages:new':
      var messageObj = JSON.parse(message.data.message);

      var from = (messageObj.otherUser.name || messageObj.otherUser.email);

      notificationOptions.body = messageObj.body;
      if (messageObj.recipe) {
        notificationOptions.body = 'Shared a recipe with you: ' + messageObj.recipe.title;
        notificationOptions.icon = messageObj.recipe.image.location;
      }
      notificationOptions.icon = notificationOptions.icon || 'https://recipesage.com/assets/imgs/logo_green.png';

      notificationOptions.click_action = self.registration.scope + '#/messages/' + messageObj.otherUser.id;
      notificationOptions.data = {
        type: message.data.type,
        otherUserId: messageObj.otherUser.id
      };
      notificationOptions.tag = message.data.type + '-' + messageObj.otherUser.id;

      return self.registration.showNotification(from, notificationOptions);
    case 'import:pepperplate:complete':
      notificationOptions.body = 'Your recipes have been imported from Pepperplate.';
      // notificationOptions.icon = recipe.image.location;
      // notificationOptions.click_action = self.registration.scope + '#/messages/' + messageObj.otherUser.id;
      notificationOptions.data = {
        type: message.data.type,
        // otherUserId: messageObj.otherUser.id
      };
      notificationOptions.tag = 'import:pepperplate';

      return self.registration.showNotification('Import complete!', notificationOptions);
    case 'import:pepperplate:failed':
      // Reasons:
      // timeout
      // invalidCredentials
      // saving
      var messageObj = JSON.parse(message.data.message);

      var body = '';
      if (messageObj.reason === 'timeout') {
        body += 'Pepperplate service is unavailable right now.';
      } else if (messageObj.reason === 'invalidCredentials') {
        body += 'Incorrect Pepperplate username or password.';
      } else if (messageObj.reason === 'saving') {
        body += 'An error occured while fetching the recipes. Please try again later.';
      } else {
        return;
      }

      notificationOptions.body = body;
      // notificationOptions.icon = recipe.image.location;
      // notificationOptions.click_action = self.registration.scope + '#/messages/' + messageObj.otherUser.id;
      notificationOptions.data = {
        type: message.data.type,
        // otherUserId: messageObj.otherUser.id
      };
      notificationOptions.tag = 'import:pepperplate';

      return self.registration.showNotification('Import failed', notificationOptions);
    case 'import:pepperplate:working':
      notificationOptions.body = 'Your Pepperplate recipes are being imported into RecipeSage';
      // notificationOptions.icon = recipe.image.location;
      // notificationOptions.click_action = self.registration.scope + '#/messages/' + messageObj.otherUser.id;
      notificationOptions.data = {
        type: message.data.type,
        // otherUserId: messageObj.otherUser.id
      };
      notificationOptions.tag = 'import:pepperplate';

      return self.registration.showNotification('Import in progress', notificationOptions);
  }
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
    })
    .then(function(clientList) {
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
        }
      }
    })
  );
});

console.log("Service worker mounted");
