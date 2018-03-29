import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

/**
 * Generated class for the HomePopoverPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-home-popover',
  templateUrl: 'home-popover.html',
})
export class HomePopoverPage {

  viewOptions: any;
  
  sortUpdateListener: any;
  
  homeRef: any;

  constructor(public navCtrl: NavController, public navParams: NavParams) {
    this.viewOptions = navParams.get('viewOptions');
    this.sortUpdateListener = navParams.get('sortUpdateListener');
    this.homeRef = navParams.get('homeRef');
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad HomePopoverPage');
  }
  
  saveViewOptions() {
    localStorage.setItem('showLabels', this.viewOptions.showLabels);
    localStorage.setItem('showImages', this.viewOptions.showImages);
    localStorage.setItem('showSource', this.viewOptions.showSource);
    localStorage.setItem('sortBy', this.viewOptions.sortBy);
  }
  
  updateSort() {
    this.sortUpdateListener.call(this.homeRef);
  }
}
