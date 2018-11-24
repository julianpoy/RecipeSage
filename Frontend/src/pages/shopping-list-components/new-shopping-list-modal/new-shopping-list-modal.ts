import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController, ToastController } from 'ionic-angular';

import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { ShoppingListServiceProvider } from '../../../providers/shopping-list-service/shopping-list-service';
import { MessagingServiceProvider } from '../../../providers/messaging-service/messaging-service';
import { UserServiceProvider } from '../../../providers/user-service/user-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-new-shopping-list-modal',
  templateUrl: 'new-shopping-list-modal.html',
})
export class NewShoppingListModalPage {

  listTitle: string = '';

  selectedThreads: any = [];

  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    public utilService: UtilServiceProvider,
    public loadingService: LoadingServiceProvider,
    public shoppingListService: ShoppingListServiceProvider,
    public messagingService: MessagingServiceProvider,
    public userService: UserServiceProvider,
    public toastCtrl: ToastController,
    public navParams: NavParams) {

  }

  ionViewDidLoad() {}

  save() {
    var loading = this.loadingService.start();

    this.shoppingListService.create({
      title: this.listTitle,
      collaborators: this.selectedThreads
    }).subscribe(response => {
      loading.dismiss();
      this.viewCtrl.dismiss({
        destination: 'ShoppingListPage',
        routingData: {
          shoppingListId: response.id
        },
        setRoot: false
      });
    }, err => {
      loading.dismiss();
      switch (err.status) {
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
    });
  }

  cancel() {
    this.viewCtrl.dismiss({
      destination: false
    });
  }
}
