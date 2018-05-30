import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, ModalController, Events } from 'ionic-angular';

import { MessagingServiceProvider } from '../../providers/messaging-service/messaging-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-messages',
  templateUrl: 'messages.html',
})
export class MessagesPage {

  threads: any = [];
  
  notificationsEnabled: boolean = false;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public events: Events,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public messagingService: MessagingServiceProvider) {
      
    this.notificationsEnabled = this.messagingService.isNotificationsEnabled();
    if (!this.notificationsEnabled) {
      this.messagingService.enableNotifications();
    }

    events.subscribe('messages:new', (message) => {
      this.loadThreads().then(function() {}, function() {});
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad MessagesPage');
  }
  
  ionViewWillEnter() {
    this.loadThreads().then(function() {}, function() {});
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
      if (data.setRoot) {
        me.navCtrl.setRoot(data.destination, data.routingData || {}, {animate: true, direction: 'forward'});
      } else {
        me.navCtrl.push(data.destination, data.routingData);
      }
    });
  }
}
