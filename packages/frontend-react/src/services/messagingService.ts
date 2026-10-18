import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  type Messaging,
  onMessage,
} from "firebase/messaging";
import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";

import { usersActions } from "./server-actions/usersActions";
import { EventName, events } from "./events";
import { getIsElectron } from "../utils/electron";
import { session } from "../utils/session";
import { i18n } from "../i18n/i18n";
import { showAlert } from "../components/dialogs/showAlert";
import { navigation } from "../routes/navigation";

class MessagingService {
  private messaging: Messaging | null = null;
  private fcmToken?: string;

  private isNative = Capacitor.isNativePlatform();
  private isDesktop = getIsElectron();
  private nativePermissionGranted = false;

  private _isFCMSupported = false;
  private isFCMSupportedPromise: Promise<boolean> | undefined;

  constructor() {
    void this.updateFCMSupported();

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
    if (window.swRegistration) void onSWRegsitration.call(null);
    else window.onSWRegistration = onSWRegsitration;
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

    events.subscribe(EventName.Auth, async () => {
      if (!session.isLoggedIn()) return;

      const { receive } = await FirebaseMessaging.checkPermissions();
      this.nativePermissionGranted = receive === "granted";
      if (this.nativePermissionGranted) {
        void this.updateToken();
      }
    });

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

    navigation.navigateToHref(`/messages/${encodeURIComponent(otherUserId)}`);
  }

  private handleForegroundData(data: unknown) {
    if (typeof data !== "object" || data === null || !("type" in data)) return;

    const type = data.type;
    const reason = "reason" in data ? data.reason : undefined;

    switch (type) {
      case EventName.ImportPepperplateComplete:
        return events.publish(EventName.ImportPepperplateComplete);
      case EventName.ImportPepperplateFailed:
        return events.publish(EventName.ImportPepperplateFailed, reason);
      case EventName.ImportPepperplateWorking:
        return events.publish(EventName.ImportPepperplateWorking);
    }
  }

  private async onNativeTokenReceived(token: string) {
    if (!token) return;
    this.fcmToken = token;
    if (!session.isLoggedIn()) return;
    try {
      await usersActions.saveFCMToken(
        { fcmToken: token },
        {
          "*": () => {},
        },
      );
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

    if (this.isDesktop) {
      return true;
    }

    return (
      this._isFCMSupported &&
      "Notification" in window &&
      Notification.permission === "granted"
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
      if (!this.messaging || Notification.permission === "denied") return;

      // Skip the prompt if permissions are already granted
      if (Notification.permission === "granted") {
        void this.enableNotifications();
        return;
      }
    }

    if (
      Capacitor.getPlatform() !== "ios" &&
      !localStorage.getItem("notificationExplainationShown")
    ) {
      localStorage.setItem("notificationExplainationShown", "true");

      void showAlert({
        header: i18n.t("components.messaging.notificationPermission.header"),
        message: i18n.t("components.messaging.notificationPermission.message"),
        buttons: [
          {
            text: i18n.t("generic.cancel"),
            role: "cancel",
          },
          {
            text: i18n.t("generic.okay"),
            handler: () => {
              void this.enableNotifications();
            },
          },
        ],
      });
    } else {
      void this.enableNotifications();
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
        await usersActions.removeFCMToken(
          {
            fcmToken: token,
          },
          {
            "*": () => {},
          },
        );
      }
      this.fcmToken = undefined;
      return;
    }

    if (!this.messaging) return;
    if (!token) return;

    await usersActions.removeFCMToken(
      { fcmToken: token },
      {
        "*": () => {},
      },
    );
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
          serviceWorkerRegistration: window.swRegistration,
        });
      }

      if (!currentToken) return;

      this.fcmToken = currentToken;

      if (!session.isLoggedIn()) return;

      await usersActions.saveFCMToken(
        {
          fcmToken: currentToken,
        },
        {
          "*": () => {},
        },
      );
    } catch (err) {
      console.log("Unable to get notification token. ", err);
    }
  }
}

export const messagingService = new MessagingService();
