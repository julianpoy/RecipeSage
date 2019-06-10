import { Component, Input } from '@angular/core';
import { ToastController, ModalController, AlertController } from '@ionic/angular';
import { LoadingService } from '@/services/loading.service';
import { ShoppingListService } from '@/services/shopping-list.service';
import { UtilService } from '@/services/util.service';

@Component({
  selector: 'page-shopping-list-popover',
  templateUrl: 'shopping-list-popover.page.html',
  styleUrls: ['shopping-list-popover.page.scss']
})
export class ShoppingListPopoverPage {

  @Input() viewOptions: any;
  @Input() shoppingListId: any;
  @Input() shoppingList: any;

  constructor(
    public utilService: UtilService,
    public loadingService: LoadingService,
    public shoppingListService: ShoppingListService,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public alertCtrl: AlertController
  ) {}


  saveViewOptions() {
    localStorage.setItem('shoppingList.sortBy', this.viewOptions.sortBy);
    localStorage.setItem('shoppingList.showAddedBy', this.viewOptions.showAddedBy);
    localStorage.setItem('shoppingList.showAddedOn', this.viewOptions.showAddedOn);
    localStorage.setItem('shoppingList.showRecipeTitle', this.viewOptions.showRecipeTitle);
    localStorage.setItem('shoppingList.groupSimilar', this.viewOptions.groupSimilar);

    this.modalCtrl.dismiss();
  }

  async removeAllItems() {
    let alert = await this.alertCtrl.create({
      header: 'Confirm Removal',
      message: 'This will permanently delete all shopping list items from this list.<br /><br />This action is irreversible.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => { }
        },
        {
          text: 'Delete',
          cssClass: 'alertDanger',
          handler: () => {
            this._removeAllItems();
          }
        }
      ]
    });
    alert.present();
  }

  _removeAllItems() {
    if (this.shoppingList.items.length === 0) return;

    var loading = this.loadingService.start();

    var itemIds = this.shoppingList.items.map(el => {
      return el.id;
    });

    this.shoppingListService.remove({
      id: this.shoppingListId,
      items: itemIds
    }).then(() => {
      loading.dismiss();

      this.modalCtrl.dismiss();
    }).catch(async err => {
      loading.dismiss();
      switch (err.status) {
        case 0:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          })).present();
          break;
        case 401:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.unauthorized,
            duration: 6000
          })).present();
          break;
        default:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          })).present();
          break;
      }
    });
  }

  async deleteList() {
    let alert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: 'This will <b>permanently</b> remove this shopping list from your account.<br /><br /><b>Note</b>: If you\'re only a collaborator on this list, it\'ll only be removed from your account. If you own this list, it will be removed from all other collaborators accounts.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => { }
        },
        {
          text: 'Delete',
          cssClass: 'alertDanger',
          handler: () => {
            this._deleteList();
          }
        }
      ]
    });
    alert.present();
  }

  _deleteList() {
    var loading = this.loadingService.start();

    this.shoppingListService.unlink({
      id: this.shoppingListId
    }).then(() => {
      loading.dismiss();

      this.modalCtrl.dismiss({
        setRoot: true,
        destination: 'ShoppingListsPage'
      });
    }).catch(async err => {
      loading.dismiss();
      switch (err.status) {
        case 0:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          })).present();
          break;
        case 401:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.unauthorized,
            duration: 6000
          })).present();
          break;
        default:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          })).present();
          break;
      }
    });
  }
}
