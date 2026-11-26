import { Injectable, inject } from "@angular/core";
import { AlertController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import * as Sentry from "@sentry/browser";
import { TimerAlarm } from "../utils/TimerAlarm";

const TIMERS_LOCALSTORAGE_KEY = "timers";
const TIMERS_LOCALSTORAGE_VERSION = "1";
const TIMER_NOTIFICATION_SOUND = "timer_alarm.wav";
const MAX_NOTIFICATION_ID = 2147483647;
const PENDING_GRACE_PERIOD_MS = 2000;

type TimerAlertType = "iosAlarm" | "androidAlarm" | "iosNotification";

export interface KitchenTimer {
  id: number;
  label: string;
  endsAt: number;
  alertScheduled: boolean;
  recipeTitle?: string;
}

export interface StartTimerOptions {
  label: string;
  durationSeconds: number;
  recipeTitle?: string;
}

@Injectable({
  providedIn: "root",
})
export class TimerService {
  private alertCtrl = inject(AlertController);
  private translate = inject(TranslateService);

  isSupported = Capacitor.isNativePlatform();
  timers: KitchenTimer[] = [];

  private alertTypePromise?: Promise<TimerAlertType>;
  private exactAlarmAlertShown = false;
  private silentModeAlertShown = false;
  private schedulingTimerIds = new Set<number>();

  constructor() {
    if (!this.isSupported) return;

    try {
      const savedValue = localStorage.getItem(TIMERS_LOCALSTORAGE_KEY);
      if (savedValue) {
        const parsed = JSON.parse(savedValue);
        if (Array.isArray(parsed.timers)) this.timers = parsed.timers;
      }
    } catch (e) {
      Sentry.captureException(e);
    }

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        void this.rescheduleRunningTimers();
      }
    });
    void this.rescheduleRunningTimers();
  }

  getRemainingSeconds(timer: KitchenTimer, now: number) {
    return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
  }

  async start(options: StartTimerOptions) {
    const timer: KitchenTimer = {
      id: this.createTimerId(),
      label: options.label,
      endsAt: Date.now() + options.durationSeconds * 1000,
      alertScheduled: false,
      recipeTitle: options.recipeTitle,
    };
    this.timers.push(timer);
    this.save();

    this.schedulingTimerIds.add(timer.id);
    try {
      const alertType = await this.getAlertType();

      const canAlert = await this.requestPermission(alertType);
      if (!canAlert) {
        await this.showPermissionDisabledAlert(alertType);
        return;
      }

      if (alertType === "iosNotification") {
        await this.showSilentModeAlertOnce();
      }
      if (alertType === "androidAlarm") {
        await this.showExactAlarmAlertOnce();
      }

      await this.scheduleAlert(timer, alertType);
    } finally {
      this.schedulingTimerIds.delete(timer.id);
    }
  }

  async remove(timer: KitchenTimer) {
    const timerIdx = this.timers.indexOf(timer);
    if (timerIdx === -1) return;

    this.timers.splice(timerIdx, 1);
    this.save();

    if (!timer.alertScheduled) return;
    try {
      const alertType = await this.getAlertType();
      if (alertType === "iosNotification") {
        await LocalNotifications.cancel({
          notifications: [{ id: timer.id }],
        });
        await LocalNotifications.removeDeliveredNotificationsById({
          ids: [timer.id],
        });
      } else {
        await TimerAlarm.cancel({ id: timer.id });
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  private save() {
    localStorage.setItem(
      TIMERS_LOCALSTORAGE_KEY,
      JSON.stringify({
        timers: this.timers,
        version: TIMERS_LOCALSTORAGE_VERSION,
      }),
    );
  }

  private createTimerId() {
    let id = 0;
    while (!id || this.timers.some((timer) => timer.id === id)) {
      id = Math.floor(Math.random() * (MAX_NOTIFICATION_ID - 1)) + 1;
    }
    return id;
  }

  private getAlertType() {
    this.alertTypePromise ??= this.findAlertType();
    return this.alertTypePromise;
  }

  private async findAlertType(): Promise<TimerAlertType> {
    if (Capacitor.getPlatform() === "android") return "androidAlarm";

    try {
      const { available } = await TimerAlarm.isAvailable();
      if (available) return "iosAlarm";
    } catch (e) {
      Sentry.captureException(e);
    }
    return "iosNotification";
  }

  private async requestPermission(alertType: TimerAlertType) {
    if (alertType === "iosAlarm") return this.requestAlarmPermission();
    return this.requestNotificationPermission();
  }

  private async requestAlarmPermission() {
    try {
      const { granted } = await TimerAlarm.requestPermission();
      return granted;
    } catch (e) {
      Sentry.captureException(e);
      return false;
    }
  }

  private async requestNotificationPermission() {
    try {
      const { display } = await LocalNotifications.checkPermissions();
      if (display === "granted") return true;
      if (display === "denied") return false;

      const requested = await LocalNotifications.requestPermissions();
      return requested.display === "granted";
    } catch (e) {
      Sentry.captureException(e);
      return false;
    }
  }

  private async showExactAlarmAlertOnce() {
    if (this.exactAlarmAlertShown) return;

    try {
      const { exact_alarm } =
        await LocalNotifications.checkExactNotificationSetting();
      if (exact_alarm === "granted") return;
    } catch (e) {
      Sentry.captureException(e);
      return;
    }

    this.exactAlarmAlertShown = true;
    const shouldOpenSettings = await this.showExactAlarmAlert();
    if (!shouldOpenSettings) return;

    try {
      await LocalNotifications.changeExactNotificationSetting();
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  private async showSilentModeAlertOnce() {
    if (this.silentModeAlertShown) return;
    this.silentModeAlertShown = true;

    const [header, message, okay] = await Promise.all([
      this.translate.get("services.timer.silentModeHeader").toPromise(),
      this.translate.get("services.timer.silentModeMessage").toPromise(),
      this.translate.get("generic.okay").toPromise(),
    ]);

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [okay],
    });
    await alert.present();
  }

  private async getAlertBody(timer: KitchenTimer) {
    if (timer.recipeTitle) {
      return this.translate
        .get("services.timer.notificationBodyRecipe", {
          recipeTitle: timer.recipeTitle,
        })
        .toPromise();
    }
    return this.translate.get("services.timer.notificationBody").toPromise();
  }

  private async scheduleAlert(timer: KitchenTimer, alertType: TimerAlertType) {
    try {
      const body = await this.getAlertBody(timer);

      if (alertType === "iosNotification") {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: timer.id,
              title: timer.label,
              body,
              sound: TIMER_NOTIFICATION_SOUND,
              interruptionLevel: "timeSensitive",
              schedule: {
                at: new Date(timer.endsAt),
              },
            },
          ],
        });
      } else {
        const [stopLabel, channelName] = await Promise.all([
          this.translate.get("services.timer.stop").toPromise(),
          this.translate.get("services.timer.channelName").toPromise(),
        ]);

        await TimerAlarm.schedule({
          id: timer.id,
          endsAt: timer.endsAt,
          title: timer.label,
          body,
          stopLabel,
          channelName,
        });
      }

      timer.alertScheduled = true;
      this.save();
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  private async rescheduleRunningTimers() {
    const runningTimers = this.timers.filter(
      (timer) =>
        timer.endsAt > Date.now() + PENDING_GRACE_PERIOD_MS &&
        !this.schedulingTimerIds.has(timer.id),
    );
    if (!runningTimers.length) return;

    const alertType = await this.getAlertType();
    if (alertType === "iosAlarm") return;

    try {
      const { display } = await LocalNotifications.checkPermissions();
      if (display !== "granted") return;
    } catch (e) {
      Sentry.captureException(e);
      return;
    }

    for (const timer of runningTimers) {
      if (this.schedulingTimerIds.has(timer.id)) continue;

      this.schedulingTimerIds.add(timer.id);
      try {
        await this.scheduleAlert(timer, alertType);
      } finally {
        this.schedulingTimerIds.delete(timer.id);
      }
    }
  }

  private async showExactAlarmAlert() {
    const [header, message, notNow, openSettings] = await Promise.all([
      this.translate.get("services.timer.exactAlarmHeader").toPromise(),
      this.translate.get("services.timer.exactAlarmMessage").toPromise(),
      this.translate.get("services.timer.notNow").toPromise(),
      this.translate.get("services.timer.openSettings").toPromise(),
    ]);

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: notNow,
          role: "cancel",
        },
        {
          text: openSettings,
          role: "confirm",
        },
      ],
    });
    await alert.present();

    const { role } = await alert.onDidDismiss();
    return role === "confirm";
  }

  private async showPermissionDisabledAlert(alertType: TimerAlertType) {
    const [header, message, okay] = await Promise.all(
      alertType === "iosAlarm"
        ? [
            this.translate
              .get("services.timer.alarmsDisabledHeader")
              .toPromise(),
            this.translate
              .get("services.timer.alarmsDisabledMessage")
              .toPromise(),
            this.translate.get("generic.okay").toPromise(),
          ]
        : [
            this.translate
              .get("services.timer.notificationsDisabledHeader")
              .toPromise(),
            this.translate
              .get("services.timer.notificationsDisabledMessage")
              .toPromise(),
            this.translate.get("generic.okay").toPromise(),
          ],
    );

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [okay],
    });
    await alert.present();
  }
}
