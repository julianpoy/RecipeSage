import { getElectronAPI } from "./electron";

const RS_LOGO_URL = "https://recipesage.com/assets/imgs/logo_green.png";

export interface LocalNotification {
  title: string;
  body: string;
  tag: string;
  route?: string;
  skipWhenHidden?: boolean;
}

export const showLocalNotification = (
  notification: LocalNotification,
): void => {
  const electronAPI = getElectronAPI();
  if (electronAPI) {
    void electronAPI.showNotification({
      title: notification.title,
      body: notification.body,
      tag: notification.tag,
      route: notification.route,
    });
    return;
  }

  void showWebNotification(notification);
};

const showWebNotification = async (
  notification: LocalNotification,
): Promise<void> => {
  if (!("serviceWorker" in navigator)) return;
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;
  if (notification.skipWhenHidden && document.visibilityState !== "visible")
    return;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(notification.title, {
      tag: notification.tag,
      icon: RS_LOGO_URL,
      body: notification.body,
      data: { route: notification.route },
    });
  } catch (e) {
    console.warn("Failed to show local notification", e);
  }
};
