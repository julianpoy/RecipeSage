import { Component } from '@angular/core';
import { IonicPage, NavController } from 'ionic-angular';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-import',
  templateUrl: 'import.html',
})
export class ImportPage {

  constructor(
    public navCtrl: NavController) {
  }

  ionViewDidLoad() {}

  goTo(state) {
    this.navCtrl.push(state);
  }
}
