import { Injectable } from '@angular/core';

import { Events, ToastController } from 'ionic-angular';

import * as firebase from 'firebase';

import { UserServiceProvider } from '../../providers/user-service/user-service';

@Injectable()
export class MessagingServiceProvider {
  private messaging: firebase.messaging.Messaging;
  private unsubscribeOnTokenRefresh = () => {};
  private fcmToken: any;
  
  constructor(
  public events: Events,
  public userService: UserServiceProvider,
  public toastCtrl: ToastController) {
    console.log('Hello MessagingServiceProvider Provider');
    
    if ((<any>window).swRegistration) {
      console.log("Has service worker registration. Beginning setup.")
      var config = {
        messagingSenderId: "1064631313987"
      };
      firebase.initializeApp(config);
  
      this.messaging = firebase.messaging();
      this.messaging.useServiceWorker((<any>window).swRegistration);
      
      var me = this;
      this.messaging.onMessage(function(message: any) {
        console.log("received message", message)
        
        switch(message.data.type) {
          case 'recipe:inbox:new':
            var recipe = JSON.parse(message.data.recipe);
            
            me.events.publish('recipe:inbox:new', recipe);
        }
      });
    }
  }
  
  public enableNotifications() {
    console.log('Requesting permission...');
    return this.messaging.requestPermission().then(() => {
      console.log('Permission granted');
      // token might change - we need to listen for changes to it and update it
      this.setupOnTokenRefresh();
      return this.updateToken();
    }).catch(function(err) {
      console.log('Unable to get permission to notify. ', err);
    });
  }

  public disableNotifications() {
    this.unsubscribeOnTokenRefresh();
    this.unsubscribeOnTokenRefresh = () => {};
    return this.userService.removeFCMToken(this.fcmToken).subscribe(function(response) {
      console.log("deleted FCM token", response);
    }, function(err) {
      console.log("failed to delete FCM token", err);
    });
  }

  private updateToken() {
    return this.messaging.getToken().then((currentToken) => {
      console.log("current token", currentToken)
      if (currentToken) {
        this.fcmToken = currentToken;
        console.log("saving FCM token", currentToken)
        // we've got the token from Firebase, now let's store it in the database
        return this.userService.saveFCMToken(currentToken).subscribe(function(response) {
          console.log("saved FCM token", response);
        }, function(err) {
          console.log("failed to save FCM token", err);
        });
      } else {
        console.log('No Instance ID token available. Request permission to generate one.');
      }
    }).catch(function(err) {
      console.log('Unable to get notification token. ', err);
    });
  }

  private setupOnTokenRefresh() {
    this.unsubscribeOnTokenRefresh = this.messaging.onTokenRefresh(() => {
      console.log("Token refreshed");
      this.userService.removeFCMToken(this.fcmToken).subscribe(function(response) {
        this.updateToken();
      }, function(err) {
        this.updateToken();
      });;
    });
  }

}
