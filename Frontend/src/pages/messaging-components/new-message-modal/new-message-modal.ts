import { Component } from '@angular/core';
import { IonicPage, NavController, ViewController, NavParams, ToastController } from 'ionic-angular';

import { UserServiceProvider } from '../../../providers/user-service/user-service';
import { MessagingServiceProvider } from '../../../providers/messaging-service/messaging-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-new-message-modal',
  templateUrl: 'new-message-modal.html',
})
export class NewMessageModalPage {

  searching: boolean = false;
  autofillTimeout: any;

  recipientEmail: string = '';
  recipientName: string = '';
  recipientId: string = '';

  message: string = '';

  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    public navParams: NavParams,
    public toastCtrl: ToastController,
    public userService: UserServiceProvider,
    public utilService: UtilServiceProvider,
    public messagingService: MessagingServiceProvider) {
  }

  ionViewDidLoad() {}

  autofillUserName() {
    this.searching = true;

    if (this.autofillTimeout) clearTimeout(this.autofillTimeout);

    this.autofillTimeout = setTimeout(() => {
      this.userService.getUserByEmail(this.recipientEmail.trim()).subscribe(response => {
        this.recipientName = response.name || response.email;
        this.searching = false;
        this.recipientId = response.id;
      }, err => {
        switch(err.status) {
          case 0:
            let offlineToast = this.toastCtrl.create({
              message: this.utilService.standardMessages.offlinePushMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          default:
            this.recipientName = '';
            this.recipientId = '';
            this.searching = false;
            break;
        }
      });
    }, 500);
  }

  send() {
    this.message = this.message || 'Hello! I\'d like to chat on RecipeSage';

    this.messagingService.create({
      to: this.recipientId,
      body: this.message
    }).subscribe(response => {
      this.viewCtrl.dismiss({
        destination: 'MessageThreadPage',
        routingData: {
          otherUserId: this.recipientId
        },
        setRoot: false
      });
    }, err => {
      switch(err.status) {
        case 0:
          let offlineToast = this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          this.viewCtrl.dismiss({
            destination: 'LoginPage',
            setRoot: true
          });
          break;
        default:
          let errorToast = this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    })
  }

  cancel() {
    this.viewCtrl.dismiss({
      destination: false
    });
  }
}
