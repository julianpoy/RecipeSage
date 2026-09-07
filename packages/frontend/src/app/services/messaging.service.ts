import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  Messaging,
  onMessage,
} from "firebase/messaging";
import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";

import { Injectable, NgZone, inject } from "@angular/core";
import { Router } from "@angular/router";

import { AlertController } from "@ionic/angular/standalone";

import { ServerActionsService } from "./server-actions.service";
import { EventName, EventService } from "./event.service";
import { RouteMap } from "./util.service";
import { TranslateService } from "@ngx-translate/core";

@Injectable({
  providedIn: "root",
})
export class MessagingService {
  private events = inject(EventService);
  private translate = inject(TranslateService);
  private serverActionsService = inject(ServerActionsService);
  private alertCtrl = inject(AlertController);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  private messaging: Messaging | null = null;
  private fcmToken?: string;

  private isNative = Capacitor.isNativePlatform();
  private nativePermissionGranted = false;

  private _isFCMSupported: boolean = false;
  private isFCMSupportedPromise: Promise<boolean> | undefined;

  constructor() {
    this.updateFCMSupported();

    if (this.isNative) {
      void this.initNative();
      return;
    }

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
        this.handleForegroundData(message.data);
      });
    };
    if ((window as any).swRegistration) onSWRegsitration.call(null);
    else (window as any).onSWRegistration = onSWRegsitration;
  }

  private async initNative() {
    const isFCMSupported = await this.isFCMSupportedPromise;
    if (!isFCMSupported) return;

    const { receive } = await FirebaseMessaging.checkPermissions();
    this.nativePermissionGranted = receive === "granted";

    await FirebaseMessaging.addListener("notificationReceived", (event) => {
      // TODO: REPLACE WITH GRIP (WS)
      this.handleForegroundData(event.notification.data);
    });

    await FirebaseMessaging.addListener("tokenReceived", (event) => {
      void this.onNativeTokenReceived(event.token);
    });

    await FirebaseMessaging.addListener(
      "notificationActionPerformed",
      (event) => {
        this.handleNotificationTap(event.notification.data);
      },
    );

    if (this.nativePermissionGranted) {
      void this.updateToken();
    }
  }

  private handleNotificationTap(data: unknown) {
    if (typeof data !== "object" || data === null || !("otherUserId" in data)) {
      return;
    }

    const otherUserId = data.otherUserId;
    if (typeof otherUserId !== "string" || !otherUserId) return;

    void this.ngZone.run(() =>
      this.router.navigateByUrl(
        RouteMap.MessageThreadPage.getPath(encodeURIComponent(otherUserId)),
      ),
    );
  }

  private handleForegroundData(data: unknown) {
    if (typeof data !== "object" || data === null || !("type" in data)) return;

    const type = data.type;
    const reason = "reason" in data ? data.reason : undefined;

    switch (type) {
      case EventName.ImportPepperplateComplete:
        return this.events.publish(EventName.ImportPepperplateComplete);
      case EventName.ImportPepperplateFailed:
        return this.events.publish(EventName.ImportPepperplateFailed, reason);
      case EventName.ImportPepperplateWorking:
        return this.events.publish(EventName.ImportPepperplateWorking);
    }
  }

  private async onNativeTokenReceived(token: string) {
    if (!token) return;
    this.fcmToken = token;
    try {
      await this.serverActionsService.users.saveFCMToken({ fcmToken: token });
    } catch (err) {
      console.log("Unable to save refreshed notification token. ", err);
    }
  }

  async updateFCMSupported() {
    if (this.isNative) {
      this._isFCMSupported = true;
      this.isFCMSupportedPromise = Promise.resolve(true);
      return;
    }

    this.isFCMSupportedPromise = isSupported();
    this._isFCMSupported = await this.isFCMSupportedPromise;
  }

  isNotificationsEnabled() {
    if (this.isNative) {
      return this._isFCMSupported && this.nativePermissionGranted;
    }

    return (
      this._isFCMSupported &&
      "Notification" in window &&
      (Notification as any).permission === "granted"
    );
  }

  isNotificationsCapable() {
    return this._isFCMSupported;
  }

  async requestNotifications() {
    const isFCMSupported = await this.isFCMSupportedPromise;
    if (!isFCMSupported) return;

    if (!this.isNative) {
      if (!("Notification" in window)) return;
      if (!this.messaging || (Notification as any).permission === "denied")
        return;

      // Skip the prompt if permissions are already granted
      if ((Notification as any).permission === "granted") {
        this.enableNotifications();
        return;
      }
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
    if (!isFCMSupported) return;

    if (this.isNative) {
      const { receive } = await FirebaseMessaging.requestPermissions();
      this.nativePermissionGranted = receive === "granted";
      if (receive !== "granted") return;
      return this.updateToken();
    }

    if (!this.messaging) return;

    console.log("Requesting permission...");
    await Notification.requestPermission();

    return this.updateToken();
  }

  public async disableNotifications() {
    const isFCMSupported = await this.isFCMSupportedPromise;
    if (!isFCMSupported) return;

    const token = this.fcmToken;

    if (this.isNative) {
      this.nativePermissionGranted = false;
      try {
        await FirebaseMessaging.deleteToken();
      } catch (err) {
        console.log("Unable to delete notification token. ", err);
      }
      if (token) {
        await this.serverActionsService.users.removeFCMToken({
          fcmToken: token,
        });
      }
      this.fcmToken = undefined;
      return;
    }

    if (!this.messaging) return;
    if (!token) return;

    await this.serverActionsService.users.removeFCMToken({ fcmToken: token });
    this.fcmToken = undefined;
  }

  private async updateToken() {
    const isFCMSupported = await this.isFCMSupportedPromise;
    if (!isFCMSupported) return;

    try {
      let currentToken: string;
      if (this.isNative) {
        const { token } = await FirebaseMessaging.getToken();
        currentToken = token;
      } else {
        if (!this.messaging) return;
        currentToken = await getToken(this.messaging, {
          serviceWorkerRegistration: (window as any).swRegistration,
        });
      }

      if (!currentToken) return;

      this.fcmToken = currentToken;

      await this.serverActionsService.users.saveFCMToken({
        fcmToken: currentToken,
      });
    } catch (err) {
      console.log("Unable to get notification token. ", err);
    }
  }
}
