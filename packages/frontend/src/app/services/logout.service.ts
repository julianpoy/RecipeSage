import { Injectable, inject } from "@angular/core";
import { ServerActionsService } from "./server-actions.service";
import { MessagingService } from "./messaging.service";
import { EventName, EventService } from "./event.service";
import { appIdbStorageManager } from "../utils/appIdbStorageManager";

@Injectable({
  providedIn: "root",
})
export class LogoutService {
  private serverActionsService = inject(ServerActionsService);
  private messagingService = inject(MessagingService);
  private events = inject(EventService);

  async logout(): Promise<void> {
    await this.messagingService.disableNotifications();

    this.serverActionsService.users.logout({
      "*": () => {},
    });

    localStorage.removeItem("token");
    this.events.publish(EventName.Auth);
    await appIdbStorageManager.deleteAllData();
  }
}
