import { Component } from '@angular/core';
import { ModalController, ToastController, NavController } from '@ionic/angular';

import { LoadingService } from '@/services/loading.service';
import { ShoppingListService } from '@/services/shopping-list.service';
import { MessagingService } from '@/services/messaging.service';
import { UserService } from '@/services/user.service';
import { UtilService, RouteMap } from '@/services/util.service';

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
    public navCtrl: NavController,
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
      this.modalCtrl.dismiss();
      this.navCtrl.navigateRoot(RouteMap.ShoppingListPage.getPath(response.id));
    }).catch(async err => {
      loading.dismiss();
      switch (err.response.status) {
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
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
