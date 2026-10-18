import { usersActions } from "./server-actions/usersActions";
import { messagingService } from "./messagingService";
import { EventName, events } from "./events";
import { appIdbStorageManager } from "../utils/appIdbStorageManager";

export const logoutService = {
  async logout(): Promise<void> {
    await messagingService.disableNotifications();
    void usersActions.logout({
      "*": () => {},
    });
    localStorage.removeItem("token");
    events.publish(EventName.Auth);
    await appIdbStorageManager.deleteAllData();
  },
};
