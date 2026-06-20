import { Component, inject } from "@angular/core";
import {
  NavController,
  ToastController,
  ModalController,
} from "@ionic/angular/standalone";

import type { MessageThreadDTO } from "@recipesage/prisma";
import { MessagingService } from "../../../services/messaging.service";
import { ServerActionsService } from "../../../services/server-actions.service";
import { LoadingService } from "../../../services/loading.service";
import { WebsocketService } from "../../../services/websocket.service";
import { EventService } from "../../../services/event.service";
import { UtilService, RouteMap } from "../../../services/util.service";
import { NewMessageModalPage } from "../new-message-modal/new-message-modal.page";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { NullStateComponent } from "../../../components/null-state/null-state.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonFab,
  IonFabButton,
  IonFooter,
  IonSpinner,
} from "@ionic/angular/standalone";
import { add, chatbox } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-messages",
  templateUrl: "messages.page.html",
  styleUrls: ["messages.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    NullStateComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonFab,
    IonFabButton,
    IonFooter,
    IonSpinner,
  ],
})
export class MessagesPage {
  navCtrl = inject(NavController);
  events = inject(EventService);
  toastCtrl = inject(ToastController);
  modalCtrl = inject(ModalController);
  utilService = inject(UtilService);
  loadingService = inject(LoadingService);
  websocketService = inject(WebsocketService);
  messagingService = inject(MessagingService);
  serverActionsService = inject(ServerActionsService);

  loading = true;

  threads: MessageThreadDTO[] = [];

  constructor() {
    addIcons({ add, chatbox });
    this.messagingService.requestNotifications();
  }

  ionViewWillEnter() {
    this.loadThreadsWithProgress();

    this.websocketService.on("messages:new", this.loadThreads);
  }

  ionViewWillLeave() {
    this.websocketService.off("messages:new", this.loadThreads);
  }

  loadThreadsWithProgress = () => {
    const loading = this.loadingService.start();
    this.loadThreads().finally(() => {
      this.loading = false;
      loading.dismiss();
    });
  };

  loadThreads = async () => {
    const response = await this.serverActionsService.messages.getThreads();
    if (!response) return;
    this.threads = response;
  };

  openThread(thread: MessageThreadDTO) {
    this.navCtrl.navigateForward(
      RouteMap.MessageThreadPage.getPath(thread.otherUser.id),
    );
  }

  async newThread() {
    const modal = await this.modalCtrl.create({
      component: NewMessageModalPage,
    });
    modal.present();
  }

  isNotificationsCapable() {
    return this.messagingService.isNotificationsCapable();
  }

  isNotificationsEnabled() {
    return this.messagingService.isNotificationsEnabled();
  }

  prettyDate(date: Date | string | number) {
    return this.utilService.formatDate(date, { now: true });
  }
}
