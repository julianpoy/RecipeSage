import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, ToastController, NavParams, ViewController, Select } from 'ionic-angular';

import { LabelServiceProvider } from '../../providers/label-service/label-service';
import { UtilServiceProvider } from '../../providers/util-service/util-service';

@IonicPage({
  priority: 'high'
})
@Component({
  selector: 'page-home-popover',
  templateUrl: 'home-popover.html',
})
export class HomePopoverPage {

  @ViewChild('filterByLabelSelect') filterByLabelSelect: Select;

  viewOptions: any;

  labels: any;

  constructor(
    public viewCtrl: ViewController,
    public navCtrl: NavController,
    public toastCtrl: ToastController,
    public navParams: NavParams,
    public utilService: UtilServiceProvider,
    public labelService: LabelServiceProvider) {
    this.viewOptions = navParams.get('viewOptions');
  }

  ionViewDidLoad() {
    this.labelService.fetch().subscribe(response => {
      this.labels = response;
    }, err => {
      switch(err.status) {
        case 0:
          let offlineToast = this.toastCtrl.create({
            message: this.utilService.standardMessages.offlineFetchMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          this.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
          break;
        default:
          let errorToast = this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }

  saveViewOptions(refreshSearch?: boolean) {
    localStorage.setItem('showLabels', this.viewOptions.showLabels);
    localStorage.setItem('showImages', this.viewOptions.showImages);
    localStorage.setItem('showSource', this.viewOptions.showSource);
    localStorage.setItem('sortBy', this.viewOptions.sortBy);
    this.viewCtrl.dismiss({
      refreshSearch
    });
  }

  resetFilterByLabel() {
    this.filterByLabelSelect.close()
    this.viewOptions.selectedLabels.splice(0, this.viewOptions.selectedLabels.length)
    this.saveViewOptions(true)
  }
}
