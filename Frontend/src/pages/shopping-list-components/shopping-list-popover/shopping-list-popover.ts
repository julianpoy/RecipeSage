import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, ViewController, AlertController } from 'ionic-angular';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { ShoppingListServiceProvider } from '../../../providers/shopping-list-service/shopping-list-service';

@IonicPage()
@Component({
  selector: 'page-shopping-list-popover',
  templateUrl: 'shopping-list-popover.html',
})
export class ShoppingListPopoverPage {

  viewOptions: any;
  shoppingListId: any;
  shoppingList: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public loadingService: LoadingServiceProvider,
    public shoppingListService: ShoppingListServiceProvider,
    public toastCtrl: ToastController,
    public viewCtrl: ViewController,
    public alertCtrl: AlertController
  ) {
    this.viewOptions = navParams.get('viewOptions');
    this.shoppingListId = navParams.get('shoppingListId');
    this.shoppingList = navParams.get('shoppingList');
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ShoppingListPopoverPage');
  }

  saveViewOptions() {
    localStorage.setItem('shoppingList.sortBy', this.viewOptions.sortBy);
    localStorage.setItem('shoppingList.showAddedBy', this.viewOptions.showAddedBy);
    localStorage.setItem('shoppingList.showAddedOn', this.viewOptions.showAddedOn);
    localStorage.setItem('shoppingList.showRecipeTitle', this.viewOptions.showRecipeTitle);
    localStorage.setItem('shoppingList.groupSimilar', this.viewOptions.groupSimilar);

    this.viewCtrl.dismiss();
  }

  removeAllItems() {
    let alert = this.alertCtrl.create({
      title: 'Confirm Removal',
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

    var me = this;
    var loading = this.loadingService.start();

    var itemIds = this.shoppingList.items.map(function(el) {
      return el._id;
    });

    this.shoppingListService.remove({
      _id: this.shoppingListId,
      items: itemIds
    }).subscribe(function () {
      loading.dismiss();

      me.viewCtrl.dismiss();
    }, function (err) {
      loading.dismiss();
      switch (err.status) {
        case 0:
          me.toastCtrl.create({
            message: 'It looks like you\'re offline. While offline, all RecipeSage functions are read-only.',
            duration: 5000
          }).present();
          break;
        case 401:
          me.toastCtrl.create({
            message: 'You are not authorized for this action! If you believe this is in error, please log out and log in using the side menu.',
            duration: 6000
          }).present();
          break;
        default:
          me.toastCtrl.create({
            message: 'An unexpected error occured. Please try again.',
            duration: 6000
          }).present();
          break;
      }
    });
  }

  deleteList() {
    let alert = this.alertCtrl.create({
      title: 'Confirm Delete',
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
    var me = this;
    var loading = this.loadingService.start();

    this.shoppingListService.unlink({
      _id: this.shoppingListId
    }).subscribe(function () {
      loading.dismiss();

      me.viewCtrl.dismiss({
        setRoot: true,
        destination: 'ShoppingListsPage'
      });
    }, function (err) {
      loading.dismiss();
      switch (err.status) {
        case 0:
          me.toastCtrl.create({
            message: 'It looks like you\'re offline. While offline, all RecipeSage functions are read-only.',
            duration: 5000
          }).present();
          break;
        case 401:
          me.toastCtrl.create({
            message: 'You are not authorized for this action! If you believe this is in error, please log out and log in using the side menu.',
            duration: 6000
          }).present();
          break;
        default:
          me.toastCtrl.create({
            message: 'An unexpected error occured. Please try again.',
            duration: 6000
          }).present();
          break;
      }
    });
  }
}
