import { Component } from "@angular/core";
import {
  NavController,
  ToastController,
  ModalController,
} from "@ionic/angular";

import { MessageThread, MessagingService } from "~/services/messaging.service";
import { LoadingService } from "~/services/loading.service";
import { WebsocketService } from "~/services/websocket.service";
import { EventService } from "~/services/event.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { NewMessageModalPage } from "~/pages/messaging-components/new-message-modal/new-message-modal.page";

@Component({
  selector: "page-messages",
  templateUrl: "messages.page.html",
  styleUrls: ["messages.page.scss"],
})
export class MessagesPage {
  loading = true;

  threads: any = [];

  constructor(
    public navCtrl: NavController,
    public events: EventService,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public websocketService: WebsocketService,
    public messagingService: MessagingService,
  ) {
    this.messagingService.requestNotifications();

    this.websocketService.register(
      "messages:new",
      () => {
        this.loadThreads();
      },
      this,
    );
  }

  ionViewWillEnter() {
    const loading = this.loadingService.start();
    this.loadThreads().finally(() => {
      this.loading = false;
      loading.dismiss();
    });
  }

  refresh(refresher: any) {
    this.loadThreads().then(
      () => {
        refresher.target.complete();
      },
      () => {
        refresher.target.complete();
      },
    );
  }

  async loadThreads() {
    const response = await this.messagingService.threads({
      limit: 1,
    });
    if (!response.success) return;

    this.threads = response.data.sort((a, b) => {
      const aCreatedAt = new Date(a.messages[0].updatedAt);
      const bCreatedAt = new Date(b.messages[0].updatedAt);
      // Ascending (newest first)
      return bCreatedAt.valueOf() - aCreatedAt.valueOf();
    });
  }

  openThread(thread: MessageThread) {
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
