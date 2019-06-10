import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'page-import',
  templateUrl: 'import.page.html',
  styleUrls: ['import.page.scss']
})
export class ImportPage {

  constructor(
    public navCtrl: NavController) {
  }


  goTo(state) {
    // this.navCtrl.push(state);
  }
}
