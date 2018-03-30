/**
 * Check out https://googlechromelabs.github.io/sw-toolbox/ for
 * more info on how to use sw-toolbox to custom configure your service worker.
 */


'use strict';
importScripts('./build/sw-toolbox.js');

self.toolbox.options.cache = {
  name: 'ionic-cache'
};

// pre-cache our key assets
self.toolbox.precache(
  [
    './build/main.js',
    './build/vendor.js',
    './build/main.css',
    './build/polyfills.js',
    'index.html',
    'manifest.json'
  ]
);

// dynamically cache any other local assets
// self.toolbox.router.any('/api/*', self.toolbox.networkFirst);
// self.toolbox.router.any('/*', self.toolbox.fastest);
self.toolbox.router.any('/*', self.toolbox.networkFirst);

// for any other requests go to the network, cache,
// and then only use that cached resource if your user goes offline
self.toolbox.router.default = self.toolbox.networkFirst;

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
    case 'recipe:inbox:new':
      var recipe = JSON.parse(message.data.recipe);
      
      var title = (recipe.fromUser.name || recipe.fromUser.email);
      
      notificationOptions.body = (recipe.fromUser.name || recipe.fromUser.email) + ' sent you a recipe. Click to open "' + recipe.title + '"';
      notificationOptions.icon = recipe.image.location;
      notificationOptions.click_action = self.registration.scope + '#/recipe/' + recipe._id;
      notificationOptions.data = {
        recipeId: recipe._id
      };

      return self.registration.showNotification(title, notificationOptions);
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
        return clients.openWindow(self.registration.scope + '#/recipe/' + event.notification.data.recipeId);  
      }
    })
  );
});

console.log("Service worker mounted");
