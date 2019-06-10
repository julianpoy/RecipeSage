import firebase from 'firebase/app';
import 'firebase/messaging';

import { Injectable } from '@angular/core';
import axios, { AxiosInstance } from 'axios';

import { Events, ToastController, AlertController } from '@ionic/angular';

import { UserService } from './user.service';
import { UtilService } from './util.service';

export interface Message {
  id: string;
  from: any;
  to: any;
  body: string;
  created_at: any;
  updated_at: any;
  read: boolean;
  recipe: any;
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private messaging: firebase.messaging.Messaging;
  private unsubscribeOnTokenRefresh = () => {};
  private fcmToken: any;

  base: any;

  axiosClient: AxiosInstance;

  constructor(
  public events: Events,
  public utilService: UtilService,
  public userService: UserService,
  public alertCtrl: AlertController,
  public toastCtrl: ToastController) {
    this.axiosClient = axios.create({
      timeout: 3000,
      headers: {
        'X-Initialized-At': Date.now().toString(),
        'Content-Type': 'application/json'
      }
    });

    var onSWRegsitration = () => {
      if (!this.isNotificationsCapable()) return;

      console.log("Has service worker registration. Beginning setup.")
      var config = {
        messagingSenderId: "1064631313987"
      };
      firebase.initializeApp(config);

      this.messaging = firebase.messaging();
      this.messaging.useServiceWorker((<any>window).swRegistration);

      this.messaging.onMessage((message: any) => {
        console.log("received foreground FCM: ", message)
        // TODO: REPLACE WITH GRIP (WS)
        switch(message.data.type) {
          case 'import:pepperplate:complete':
            return this.events.publish('import:pepperplate:complete');
          case 'import:pepperplate:failed':
            return this.events.publish('import:pepperplate:failed', message.data.reason);
          case 'import:pepperplate:working':
            return this.events.publish('import:pepperplate:working');
        }
      });
    }
    if ((<any>window).swRegistration) onSWRegsitration.call(null);
    else (<any>window).onSWRegistration = onSWRegsitration;
  }

  isNotificationsCapable() {
    return firebase.messaging.isSupported()
  }

  isNotificationsEnabled() {
    return this.isNotificationsCapable() && ('Notification' in window) && ((<any>Notification).permission === 'granted');
  }

  fetch(from?) {
    var url = this.utilService.getBase() + 'messages/' + this.utilService.getTokenQuery();
    if (from) url += '&user=' + from;

    return this.axiosClient.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  threads(options?) {
    options = options || {};

    var url = this.utilService.getBase() + 'messages/threads/' + this.utilService.getTokenQuery();
    if (!options.includeMessages) url += '&light=true';
    if (options.messageLimit) url += '&limit=' + options.messageLimit;

    return this.axiosClient.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  create(data) {
    const url = this.utilService.getBase() + 'messages/' + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'post',
      url,
      data
    }).then(response => response.data);
  }

  markAsRead(from?) {
    var url = this.utilService.getBase() + 'messages/read/' + this.utilService.getTokenQuery();
    if (from) url += '&from=' + from;

    return this.axiosClient.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  async requestNotifications() {
    if (!this.isNotificationsCapable()) return;
    if (!('Notification' in window)) return;
    if (!this.messaging || (<any>Notification).permission === 'denied') return;

    // Skip the prompt if permissions are already granted
    if ((<any>Notification).permission === 'granted') {
      this.enableNotifications();
      return;
    }

    if (!localStorage.getItem('notificationExplainationShown')) {
      localStorage.setItem('notificationExplainationShown', 'true');

      let alert = await this.alertCtrl.create({
        header: 'Requires Notification Permissions',
        subHeader: 'To notify you when your contacts send you messages, we need notification access.<br /><br /><b>After dismissing this popup, you will be prompted to enable notification access.</b>',
        buttons: [
          {
            text: 'Cancel'
          },
          {
            text: 'Continue',
            handler: () => {
              this.enableNotifications();
            }
          }
        ]
      });
      alert.present();
    } else {
      this.enableNotifications();
    }
  }

  // Grab token and setup FCM
  private enableNotifications() {
    if (!this.messaging || !this.isNotificationsCapable()) return;

    console.log('Requesting permission...');
    return this.messaging.requestPermission().then(() => {
      console.log('Permission granted');
      // token might change - we need to listen for changes to it and update it
      this.setupOnTokenRefresh();
      return this.updateToken();
    }).catch(err => {
      console.log('Unable to get permission to notify. ', err);
    });
  }

  public disableNotifications() {
    if (!this.messaging || !this.isNotificationsCapable()) return;

    var token = this.fcmToken;

    this.unsubscribeOnTokenRefresh();
    this.unsubscribeOnTokenRefresh = () => {};
    return this.userService.removeFCMToken(token).then(response => {
      console.log("deleted FCM token", response);
    }).catch(err => {
      console.log("failed to delete FCM token", err);
    });
  }

  private updateToken() {
    if (!this.messaging || !this.isNotificationsCapable()) return;

    return this.messaging.getToken().then(currentToken => {
      console.log("current token", currentToken)
      if (currentToken) {
        this.fcmToken = currentToken;
        console.log("saving FCM token", currentToken)
        // we've got the token from Firebase, now let's store it in the database
        return this.userService.saveFCMToken(currentToken).then(response => {
          console.log("saved FCM token", response);
        }).catch(err => {
          console.log("failed to save FCM token", err);
        });
      } else {
        console.log('No Instance ID token available. Request permission to generate one.');
      }
    }).catch(err => {
      console.log('Unable to get notification token. ', err);
    });
  }

  private setupOnTokenRefresh() {
    if (!this.messaging || !this.isNotificationsCapable()) return;

    this.unsubscribeOnTokenRefresh = this.messaging.onTokenRefresh(() => {
      console.log("Token refreshed");
      this.userService.removeFCMToken(this.fcmToken).then(response => {
        this.updateToken();
      }).catch(err => {
        this.updateToken();
      });;
    });
  }
}
