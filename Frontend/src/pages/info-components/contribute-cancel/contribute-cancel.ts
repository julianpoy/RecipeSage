import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

@IonicPage({
  segment: 'contribute/cancel',
  priority: 'low'
})
@Component({
  selector: 'page-contribute-cancel',
  templateUrl: 'contribute-cancel.html',
})
export class ContributeCancelPage {

  constructor(public navCtrl: NavController, public navParams: NavParams) {
  }
}
