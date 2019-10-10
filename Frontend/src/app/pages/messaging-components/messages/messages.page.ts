import { Component } from '@angular/core';
import { NavController, ToastController, ModalController, Events } from '@ionic/angular';

import { MessagingService } from '@/services/messaging.service';
import { LoadingService } from '@/services/loading.service';
import { WebsocketService } from '@/services/websocket.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { NewMessageModalPage } from '@/pages/messaging-components/new-message-modal/new-message-modal.page';

@Component({
  selector: 'page-messages',
  templateUrl: 'messages.page.html',
  styleUrls: ['messages.page.scss']
})
export class MessagesPage {

  threads: any = [];

  constructor(
    public navCtrl: NavController,
    public events: Events,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public websocketService: WebsocketService,
    public messagingService: MessagingService) {

    this.messagingService.requestNotifications();

    this.websocketService.register('messages:new', payload => {
      this.loadThreads();
    }, this);
  }

  ionViewWillEnter() {
    const loading = this.loadingService.start();
    this.loadThreads().then(() => {
      loading.dismiss();
    }, () => {
      loading.dismiss();
    });
  }

  refresh(refresher) {
    this.loadThreads().then(() => {
      refresher.target.complete();
    }, () => {
      refresher.target.complete();
    });
  }

  loadThreads() {
    return new Promise((resolve, reject) => {
      this.messagingService.threads({
        includeMessages: true,
        messageLimit: 1
      }).then(response => {
        this.threads = response.sort((a, b) => {
          const aCreatedAt = new Date(a.messages[0].updatedAt);
          const bCreatedAt = new Date(b.messages[0].updatedAt);
          // Ascending (newest first)
          return bCreatedAt.valueOf() - aCreatedAt.valueOf();
        }).map(thread => {
          thread.messages[0]._updatedAt = this.utilService.formatDate(thread.messages[0].updatedAt, { now: true });
          return thread;
        });

        resolve();
      }).catch(async err => {
        reject();

        switch (err.response.status) {
          case 0:
            const offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
            break;
          default:
            const errorToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }
      });
    });
  }

  openThread(thread) {
    this.navCtrl.navigateForward(RouteMap.MessageThreadPage.getPath(thread.otherUser.id));
  }

  async newThread() {
    const modal = await this.modalCtrl.create({
      component: NewMessageModalPage
    });
    modal.present();
  }

  isNotificationsCapable() {
    return this.messagingService.isNotificationsCapable();
  }

  isNotificationsEnabled() {
    return this.messagingService.isNotificationsEnabled();
  }
}
