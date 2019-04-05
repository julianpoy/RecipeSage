import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

@IonicPage({
  segment: 'contribute/thankyou',
  priority: 'low'
})
@Component({
  selector: 'page-contribute-thankyou',
  templateUrl: 'contribute-thankyou.html',
})
export class ContributeThankYouPage {

  constructor(public navCtrl: NavController, public navParams: NavParams) {
  }
}
