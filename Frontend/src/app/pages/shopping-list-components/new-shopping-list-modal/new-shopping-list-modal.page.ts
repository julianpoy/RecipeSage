import { Component } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';

import { LoadingService } from '@/services/loading.service';
import { ShoppingListService } from '@/services/shopping-list.service';
import { MessagingService } from '@/services/messaging.service';
import { UserService } from '@/services/user.service';
import { UtilService } from '@/services/util.service';

@Component({
  selector: 'page-new-shopping-list-modal',
  templateUrl: 'new-shopping-list-modal.page.html',
  styleUrls: ['new-shopping-list-modal.page.scss']
})
export class NewShoppingListModalPage {

  listTitle: string = '';

  selectedThreads: any = [];

  constructor(
    public modalCtrl: ModalController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public shoppingListService: ShoppingListService,
    public messagingService: MessagingService,
    public userService: UserService,
    public toastCtrl: ToastController) {

  }


  save() {
    var loading = this.loadingService.start();

    this.shoppingListService.create({
      title: this.listTitle,
      collaborators: this.selectedThreads
    }).then(response => {
      loading.dismiss();
      this.modalCtrl.dismiss({
        destination: 'ShoppingListPage',
        routingData: {
          shoppingListId: response.id
        },
        setRoot: false
      });
    }).catch(async err => {
      loading.dismiss();
      switch (err.status) {
        case 0:
          let offlineToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          this.modalCtrl.dismiss({
            destination: 'LoginPage',
            setRoot: true
          });
          break;
        default:
          let errorToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }

  cancel() {
    this.modalCtrl.dismiss({
      destination: false
    });
  }
}
