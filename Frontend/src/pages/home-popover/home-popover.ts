import { Component } from '@angular/core';
import { IonicPage, NavController, ToastController, NavParams } from 'ionic-angular';

import { LabelServiceProvider } from '../../providers/label-service/label-service';

@IonicPage({
  priority: 'high'
})
@Component({
  selector: 'page-home-popover',
  templateUrl: 'home-popover.html',
})
export class HomePopoverPage {

  viewOptions: any;
  
  labels: any;

  constructor(public navCtrl: NavController, public toastCtrl: ToastController, public navParams: NavParams, public labelService: LabelServiceProvider) {
    this.viewOptions = navParams.get('viewOptions');
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad HomePopoverPage');
    
    var me = this;
    this.labelService.fetch(true).subscribe(function(response) {
      me.labels = response;
    }, function(err) {
      switch(err.status) {
        case 401:
          me.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
          break;
        default:
          let errorToast = me.toastCtrl.create({
            message: 'An unexpected error occured. Please restart application.',
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }
  
  saveViewOptions() {
    localStorage.setItem('showLabels', this.viewOptions.showLabels);
    localStorage.setItem('showImages', this.viewOptions.showImages);
    localStorage.setItem('showSource', this.viewOptions.showSource);
    localStorage.setItem('sortBy', this.viewOptions.sortBy);
  }
}
