import { Component, Input } from '@angular/core';
import { ToastController, AlertController, NavController, PopoverController } from '@ionic/angular';
import { LoadingService } from '@/services/loading.service';
import { ShoppingListService } from '@/services/shopping-list.service';
import { UtilService, RouteMap } from '@/services/util.service';
import { PreferencesService, ShoppingListPreferenceKey } from '@/services/preferences.service';

@Component({
  selector: 'page-shopping-list-popover',
  templateUrl: 'shopping-list-popover.page.html',
  styleUrls: ['shopping-list-popover.page.scss']
})
export class ShoppingListPopoverPage {

  @Input() shoppingListId: any;
  @Input() shoppingList: any;

  preferences = this.preferencesService.preferences;
  preferenceKeys = ShoppingListPreferenceKey;

  constructor(
    public navCtrl: NavController,
    public utilService: UtilService,
    public preferencesService: PreferencesService,
    public loadingService: LoadingService,
    public shoppingListService: ShoppingListService,
    public toastCtrl: ToastController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController
  ) {}

  savePreferences() {
    this.preferencesService.save();

    this.dismiss();
  }

  dismiss() {
    this.popoverCtrl.dismiss();
  }

  print() {
    window.open(this.utilService.generatePrintShoppingListURL(this.shoppingListId));
  }

  async removeAllItems() {
    const alert = await this.alertCtrl.create({
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

    const loading = this.loadingService.start();

    const itemIds = this.shoppingList.items.map(el => {
      return el.id;
    });

    this.shoppingListService.remove({
      id: this.shoppingListId,
      items: itemIds
    }).then(() => {
      loading.dismiss();

      this.popoverCtrl.dismiss();
    }).catch(async err => {
      loading.dismiss();
      switch (err.response.status) {
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
    const alert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: `This will <b>permanently</b> remove this shopping list from your account.<br /><br />
                <b>Note</b>: If you\'re only a collaborator on this list, it\'ll only be removed from your account.
                If you own this list, it will be removed from all other collaborators accounts.`,
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
    const loading = this.loadingService.start();

    this.shoppingListService.unlink({
      id: this.shoppingListId
    }).then(() => {
      loading.dismiss();

      this.popoverCtrl.dismiss();
      this.navCtrl.navigateBack(RouteMap.ShoppingListsPage.getPath());
    }).catch(async err => {
      loading.dismiss();
      switch (err.response.status) {
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
