import { Injectable, inject } from "@angular/core";
import { ServerActionsService } from "./server-actions.service";
import { MessagingService } from "./messaging.service";
import { EventName, EventService } from "./event.service";
import { LastRouteService } from "./last-route.service";
import { appIdbStorageManager } from "../utils/appIdbStorageManager";

@Injectable({
  providedIn: "root",
})
export class LogoutService {
  private serverActionsService = inject(ServerActionsService);
  private messagingService = inject(MessagingService);
  private events = inject(EventService);
  private lastRouteService = inject(LastRouteService);

  async logout(): Promise<void> {
    await this.messagingService.disableNotifications();

    this.serverActionsService.users.logout({
      "*": () => {},
    });

    localStorage.removeItem("token");
    this.lastRouteService.clear();
    this.events.publish(EventName.Auth);
    await appIdbStorageManager.deleteAllData();
  }
}
