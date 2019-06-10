import { Component } from '@angular/core';

@Component({
  selector: 'page-about',
  templateUrl: 'about.page.html',
  styleUrls: ['about.page.scss']
})
export class AboutPage {

  constructor() {}

  goTo(state) {
    // this.navCtrl.push(state);
  }
}
