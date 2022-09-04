import firebase from 'firebase/app';
import 'firebase/messaging';

import { Injectable } from '@angular/core';

import { ToastController, AlertController } from '@ionic/angular';

import { UserService } from './user.service';
import { UtilService } from './util.service';
import { HttpService } from './http.service';
import { EventService } from './event.service';
import {ErrorHandlers} from './http-error-handler.service';

export interface Message {
  id: string,
  body: string,
  createdAt: string,
  updatedAt: string,
  fromUserId: string,
  toUserId: string,
  recipeId: string | null,
  originalRecipeId: string | null,

  recipe: null | {
    id: string,
    title: string,
    images: any[],
  },
  originalRecipe: null | {
    id: string,
    title: string,
    images: any[],
  },

  fromUser: {
    id: string,
    name: string,
    email: string,
  },
  toUser: {
    id: string,
    name: string,
    email: string,
  },
  otherUser: {
    id: string,
    name: string,
    email: string,
  }
}

export interface MessageThread {
  otherUser: {
    id: string,
    name: string,
    email: string,
  },
  messageCount: number,
  messages: Message[],
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {

  private messaging: firebase.messaging.Messaging;
  private fcmToken: any;
  private unsubscribeOnTokenRefresh = () => { };

  constructor(
  public events: EventService,
  public utilService: UtilService,
  public httpService: HttpService,
  public userService: UserService,
  public alertCtrl: AlertController,
  public toastCtrl: ToastController) {

    const onSWRegsitration = () => {
      if (!this.isNotificationsCapable()) return;

      console.log('Has service worker registration. Beginning setup.');
      const config = {
        appId: '1:1064631313987:android:b6ca7a14265a6a01',
        apiKey: 'AIzaSyANy7PbiPae7dmi4yYockrlvQz3tEEIkL0',
        projectId: 'chef-book',
        messagingSenderId: '1064631313987'
      };
      firebase.initializeApp(config);

      this.messaging = firebase.messaging();
      this.messaging.useServiceWorker((window as any).swRegistration);

      this.messaging.onMessage((message: any) => {
        console.log('received foreground FCM: ', message);
        // TODO: REPLACE WITH GRIP (WS)
        switch (message.data.type) {
          case 'import:pepperplate:complete':
            return this.events.publish('import:pepperplate:complete');
          case 'import:pepperplate:failed':
            return this.events.publish('import:pepperplate:failed', message.data.reason);
          case 'import:pepperplate:working':
            return this.events.publish('import:pepperplate:working');
        }
      });
    };
    if ((window as any).swRegistration) onSWRegsitration.call(null);
    else (window as any).onSWRegistration = onSWRegsitration;
  }

  isNotificationsCapable() {
    return firebase.messaging.isSupported();
  }

  isNotificationsEnabled() {
    return this.isNotificationsCapable() && ('Notification' in window) && ((Notification as any).permission === 'granted');
  }

  fetch(payload: {
    user: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<Message[]>(
      `messages`,
      'GET',
      payload,
      errorHandlers
    );
  }

  threads(payload?: {
    limit?: number,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<MessageThread[]>(
      `messages/threads`,
      'GET',
      payload || {},
      errorHandlers
    );
  }

  create(payload: {
    body: string,
    to: string,
    recipeId?: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `messages`,
      'POST',
      payload,
      errorHandlers
    );
  }

  async requestNotifications() {
    if (!this.isNotificationsCapable()) return;
    if (!('Notification' in window)) return;
    if (!this.messaging || (Notification as any).permission === 'denied') return;

    // Skip the prompt if permissions are already granted
    if ((Notification as any).permission === 'granted') {
      this.enableNotifications();
      return;
    }

    if (!localStorage.getItem('notificationExplainationShown')) {
      localStorage.setItem('notificationExplainationShown', 'true');

      const alert = await this.alertCtrl.create({
        header: 'Requires Notification Permissions',
        message: `To notify you when your contacts send you messages, we need notification access.<br /><br />
                    <b>After dismissing this popup, you will be prompted to enable notification access.</b>`,
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

  public async disableNotifications() {
    if (!this.messaging || !this.isNotificationsCapable()) return;

    const token = this.fcmToken;

    this.unsubscribeOnTokenRefresh();
    this.unsubscribeOnTokenRefresh = () => {};
    await this.userService.removeFCMToken(token);
  }

  private async updateToken() {
    if (!this.messaging || !this.isNotificationsCapable()) return;

    try {
      const currentToken = await this.messaging.getToken();
      if (!currentToken) return;

      this.fcmToken = currentToken;

      await this.userService.saveFCMToken({
        fcmToken: currentToken
      });
    } catch(err) {
      console.log('Unable to get notification token. ', err);
    }
  }

  private setupOnTokenRefresh() {
    if (!this.messaging || !this.isNotificationsCapable()) return;

    this.unsubscribeOnTokenRefresh = this.messaging.onTokenRefresh(async () => {
      await this.userService.removeFCMToken(this.fcmToken);
      this.updateToken();
    });
  }
}
