import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, ModalController, Events } from 'ionic-angular';

import { MessagingServiceProvider } from '../../../providers/messaging-service/messaging-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { WebsocketServiceProvider } from '../../../providers/websocket-service/websocket-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-messages',
  templateUrl: 'messages.html',
})
export class MessagesPage {

  threads: any = [];

  isNotificationsEnabled: any;
  isNotificationsSupported: any = 'Notification' in window;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public events: Events,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public loadingService: LoadingServiceProvider,
    public websocketService: WebsocketServiceProvider,
    public messagingService: MessagingServiceProvider) {

    this.isNotificationsEnabled = this.messagingService.isNotificationsEnabled;

    this.messagingService.requestNotifications();

    this.websocketService.register('messages:new', function (payload) {
      this.loadThreads();
    }, this);
  }

  ionViewDidLoad() {}

  ionViewWillEnter() {
    var loading = this.loadingService.start();
    this.loadThreads().then(function() {
      loading.dismiss();
    }, function() {
      loading.dismiss();
    });
  }

  refresh(refresher) {
    this.loadThreads().then(function() {
      refresher.complete();
    }, function() {
      refresher.complete();
    });
  }

  loadThreads() {
    var me = this;

    return new Promise(function(resolve, reject) {
      me.messagingService.threads({
        includeMessages: true,
        messageLimit: 1
      }).subscribe(function(response) {
        me.threads = response;

        resolve();
      }, function(err) {
        reject();

        switch(err.status) {
          case 0:
            let offlineToast = me.toastCtrl.create({
              message: 'It looks like you\'re offline. While offline, we\'re only able to fetch data you\'ve previously accessed on this device.',
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            me.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
            break;
          default:
            let errorToast = me.toastCtrl.create({
              message: 'An unexpected error occured. Please restart application.',
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
      otherUserId: thread.otherUser._id
    });
  }

  newThread() {
    var me = this;
    let modal = this.modalCtrl.create('NewMessageModalPage');
    modal.present();
    modal.onDidDismiss(data => {
      if (!data.destination) return;

      if (data.setRoot) {
        me.navCtrl.setRoot(data.destination, data.routingData || {}, {animate: true, direction: 'forward'});
      } else {
        me.navCtrl.push(data.destination, data.routingData);
      }
    });
  }
}
