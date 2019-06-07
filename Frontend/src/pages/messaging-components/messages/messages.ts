import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, ModalController, Events } from 'ionic-angular';

import { MessagingServiceProvider } from '../../../providers/messaging-service/messaging-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { WebsocketServiceProvider } from '../../../providers/websocket-service/websocket-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-messages',
  templateUrl: 'messages.html',
})
export class MessagesPage {

  threads: any = [];

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public events: Events,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public utilService: UtilServiceProvider,
    public loadingService: LoadingServiceProvider,
    public websocketService: WebsocketServiceProvider,
    public messagingService: MessagingServiceProvider) {

    this.messagingService.requestNotifications();

    this.websocketService.register('messages:new', payload => {
      this.loadThreads();
    }, this);
  }

  ionViewDidLoad() {}

  ionViewWillEnter() {
    var loading = this.loadingService.start();
    this.loadThreads().then(() => {
      loading.dismiss();
    }, () => {
      loading.dismiss();
    });
  }

  refresh(refresher) {
    this.loadThreads().then(() => {
      refresher.complete();
    }, () => {
      refresher.complete();
    });
  }

  loadThreads() {
    return new Promise((resolve, reject) => {
      this.messagingService.threads({
        includeMessages: true,
        messageLimit: 1
      }).subscribe(response => {
        this.threads = response.sort((a, b) => {
          let aCreatedAt = new Date((a.messages[0] || []).updatedAt);
          let bCreatedAt = new Date((b.messages[0] || []).updatedAt);
          // Ascending (newest first)
          return bCreatedAt.valueOf() - aCreatedAt.valueOf();
        });

        resolve();
      }, err => {
        reject();

        switch(err.status) {
          case 0:
            let offlineToast = this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
            break;
          default:
            let errorToast = this.toastCtrl.create({
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
    this.navCtrl.push('MessageThreadPage', {
      thread: thread,
      otherUserId: thread.otherUser.id
    });
  }

  newThread() {
    let modal = this.modalCtrl.create('NewMessageModalPage');
    modal.present();
    modal.onDidDismiss(data => {
      if (!data || !data.destination) return;

      if (data.setRoot) {
        this.navCtrl.setRoot(data.destination, data.routingData || {}, {animate: true, direction: 'forward'});
      } else {
        this.navCtrl.push(data.destination, data.routingData);
      }
    });
  }

  isNotificationsCapable() {
    return this.messagingService.isNotificationsCapable();
  }

  isNotificationsEnabled() {
    return this.messagingService.isNotificationsEnabled();
  }
}
