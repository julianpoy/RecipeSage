import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-about-details',
  templateUrl: 'about-details.html',
})
export class AboutDetailsPage {

  constructor(public navCtrl: NavController, public navParams: NavParams) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad AboutDetailsPage');
  }

}
