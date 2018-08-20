import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-share-shopping-list-modal',
  templateUrl: 'share-shopping-list-modal.html',
})
export class ShareShoppingListModalPage {

  constructor(public navCtrl: NavController, public navParams: NavParams) {
  }

  ionViewDidLoad() {}

}
