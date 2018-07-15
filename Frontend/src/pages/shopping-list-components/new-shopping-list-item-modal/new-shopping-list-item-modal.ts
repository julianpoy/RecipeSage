import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController } from 'ionic-angular';

@IonicPage()
@Component({
  selector: 'page-new-shopping-list-item-modal',
  templateUrl: 'new-shopping-list-item-modal.html',
})
export class NewShoppingListItemModalPage {

  // LABELS REFERENCED HERE ARE ACTUALLY COLLABORATORS ON SHOPPING LIST ITEM
  labelObjectsByTitle: any = {};
  existingLabels: any = [];
  selectedLabels: any = [];
  pendingLabel: string = '';
  showAutocomplete: boolean = false;
  autocompleteSelectionIdx: number = -1;

  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    public navParams: NavParams) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad NewShoppingListItemModalPage');
  }

  cancel() {
    this.viewCtrl.dismiss({
      destination: false
    });
  }
}
