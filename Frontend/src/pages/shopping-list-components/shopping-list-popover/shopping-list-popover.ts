import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

/**
 * Generated class for the ShoppingListPopoverPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-shopping-list-popover',
  templateUrl: 'shopping-list-popover.html',
})
export class ShoppingListPopoverPage {

  viewOptions: any;
  shoppingListId: any;
  shoppingList: any;

  constructor(public navCtrl: NavController, public navParams: NavParams) {
    this.viewOptions = navParams.get('viewOptions');
    this.shoppingListId = navParams.get('shoppingListId');
    this.shoppingList = navParams.get('shoppingList');

    console.log(this.viewOptions)
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ShoppingListPopoverPage');
  }

  saveViewOptions() {
    localStorage.setItem('shoppingLists.sortBy', this.viewOptions.sortBy);
  }

}
