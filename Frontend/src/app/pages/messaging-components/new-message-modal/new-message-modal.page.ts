import { Component } from '@angular/core';
import { NavController, ModalController, ToastController } from '@ionic/angular';

import { UserService } from '@/services/user.service';
import { MessagingService } from '@/services/messaging.service';
import { UtilService, RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-new-message-modal',
  templateUrl: 'new-message-modal.page.html',
  styleUrls: ['new-message-modal.page.scss']
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
    public modalCtrl: ModalController,
    public toastCtrl: ToastController,
    public userService: UserService,
    public utilService: UtilService,
    public messagingService: MessagingService) {
  }


  autofillUserName() {
    this.searching = true;

    if (this.autofillTimeout) clearTimeout(this.autofillTimeout);

    this.autofillTimeout = setTimeout(() => {
      this.userService.getUserByEmail(this.recipientEmail.trim()).then(response => {
        this.recipientName = response.name || response.email;
        this.searching = false;
        this.recipientId = response.id;
      }).catch(async err => {
        switch(err.response.status) {
          case 0:
            let offlineToast = await this.toastCtrl.create({
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
    }).then(response => {
      this.modalCtrl.dismiss();
      this.navCtrl.navigateForward(RouteMap.MessageThreadPage.getPath(this.recipientId));
    }).catch(async err => {
      switch(err.response.status) {
        case 0:
          let offlineToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          this.modalCtrl.dismiss();
          this.navCtrl.navigateRoot(RouteMap.LoginPage.getPath());
          break;
        default:
          let errorToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    })
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
