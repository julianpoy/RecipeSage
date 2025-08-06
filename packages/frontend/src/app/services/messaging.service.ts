import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  Messaging,
  onMessage,
} from "firebase/messaging";

import { Injectable, inject } from "@angular/core";

import { AlertController } from "@ionic/angular";

import { UserService } from "./user.service";
import { HttpService } from "./http.service";
import { EventName, EventService } from "./event.service";
import { ErrorHandlers } from "./http-error-handler.service";
import { TranslateService } from "@ngx-translate/core";

export interface Message {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  fromUserId: string;
  toUserId: string;
  recipeId: string | null;
  originalRecipeId: string | null;

  recipe: null | {
    id: string;
    title: string;
    images: any[];
  };
  originalRecipe: null | {
    id: string;
    title: string;
    images: any[];
  };

  fromUser: {
    id: string;
    name: string;
    email: string;
  };
  toUser: {
    id: string;
    name: string;
    email: string;
  };
  otherUser: {
    id: string;
    name: string;
    email: string;
  };
}

export interface MessageThread {
  otherUser: {
    id: string;
    name: string;
    handle?: string;
    email: string;
  };
  messageCount: number;
  messages: Message[];
}

@Injectable({
  providedIn: "root",
})
export class MessagingService {
  private events = inject(EventService);
  private translate = inject(TranslateService);
  private httpService = inject(HttpService);
  private userService = inject(UserService);
  private alertCtrl = inject(AlertController);

  private messaging: Messaging | null = null;
  private fcmToken: any;

  private _isFCMSupported: boolean = false;
  private isFCMSupportedPromise: Promise<boolean> | undefined;

  constructor() {
    this.updateFCMSupported();

    const onSWRegsitration = async () => {
      const isFCMSupported = await this.isFCMSupportedPromise;
      if (!isFCMSupported) return;

      console.log("Has service worker registration. Beginning setup.");
      const config = {
        appId: "1:1064631313987:android:b6ca7a14265a6a01",
        apiKey: "AIzaSyANy7PbiPae7dmi4yYockrlvQz3tEEIkL0",
        projectId: "chef-book",
        messagingSenderId: "1064631313987",
      };
      const app = initializeApp(config);

      this.messaging = getMessaging(app);

      onMessage(this.messaging, (message) => {
        console.log("received foreground FCM: ", message);
        // TODO: REPLACE WITH GRIP (WS)
        switch (message.data?.type) {
          case EventName.ImportPepperplateComplete:
            return this.events.publish(EventName.ImportPepperplateComplete);
          case EventName.ImportPepperplateFailed:
            return this.events.publish(
              EventName.ImportPepperplateFailed,
              message.data.reason,
            );
          case EventName.ImportPepperplateWorking:
            return this.events.publish(EventName.ImportPepperplateWorking);
        }
      });
    };
    if ((window as any).swRegistration) onSWRegsitration.call(null);
    else (window as any).onSWRegistration = onSWRegsitration;
  }

  async updateFCMSupported() {
    this.isFCMSupportedPromise = isSupported();
    this._isFCMSupported = await this.isFCMSupportedPromise;
  }

  isNotificationsEnabled() {
    return (
      this._isFCMSupported &&
      "Notification" in window &&
      (Notification as any).permission === "granted"
    );
  }

  isNotificationsCapable() {
    return this._isFCMSupported;
  }

  fetch(
    params: {
      user: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<Message[]>({
      path: `messages`,
      method: "GET",
      payload: undefined,
      query: params,
      errorHandlers,
    });
  }

  threads(
    params?: {
      limit?: number;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<MessageThread[]>({
      path: `messages/threads`,
      method: "GET",
      payload: undefined,
      query: params,
      errorHandlers,
    });
  }

  create(
    payload: {
      body: string;
      to: string;
      recipeId?: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>({
      path: `messages`,
      method: "POST",
      payload: payload,
      query: undefined,
      errorHandlers,
    });
  }

  async requestNotifications() {
    const isFCMSupported = await this.isFCMSupportedPromise;
    if (!isFCMSupported) return;
    if (!("Notification" in window)) return;
    if (!this.messaging || (Notification as any).permission === "denied")
      return;

    // Skip the prompt if permissions are already granted
    if ((Notification as any).permission === "granted") {
      this.enableNotifications();
      return;
    }

    if (!localStorage.getItem("notificationExplainationShown")) {
      localStorage.setItem("notificationExplainationShown", "true");

      const header = await this.translate
        .get("components.messaging.notificationPermission.header")
        .toPromise();
      const message = await this.translate
        .get("components.messaging.notificationPermission.message")
        .toPromise();
      const cancel = await this.translate.get("generic.cancel").toPromise();
      const okay = await this.translate.get("generic.okay").toPromise();

      const alert = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          {
            text: cancel,
          },
          {
            text: okay,
            handler: () => {
              this.enableNotifications();
            },
          },
        ],
      });
      alert.present();
    } else {
      this.enableNotifications();
    }
  }

  // Grab token and setup FCM
  private async enableNotifications() {
    const isFCMSupported = await this.isFCMSupportedPromise;
    if (!this.messaging || !isFCMSupported) return;

    console.log("Requesting permission...");
    const result = await Notification.requestPermission();

    return this.updateToken();
  }

  public async disableNotifications() {
    const isFCMSupported = await this.isFCMSupportedPromise;
    if (!this.messaging || !isFCMSupported) return;

    const token = this.fcmToken;

    await this.userService.removeFCMToken(token);
  }

  private async updateToken() {
    const isFCMSupported = await this.isFCMSupportedPromise;
    if (!this.messaging || !isFCMSupported) return;

    try {
      const currentToken = await getToken(this.messaging, {
        serviceWorkerRegistration: (window as any).swRegistration,
      });
      if (!currentToken) return;

      this.fcmToken = currentToken;

      await this.userService.saveFCMToken({
        fcmToken: currentToken,
      });
    } catch (err) {
      console.log("Unable to get notification token. ", err);
    }
  }
}
