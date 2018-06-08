import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { ConfigServiceProvider } from '../../providers/config-service/config-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html',
})
export class SettingsPage {

  config: any = this.configService.getConfig()

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public configService: ConfigServiceProvider) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SettingsPage');
  }
  
  goTo(state) {
    this.navCtrl.push(state);
  }

  isScreenSideTabSize() {
    return window.matchMedia("(min-width: 768px)").matches;
  }
}
