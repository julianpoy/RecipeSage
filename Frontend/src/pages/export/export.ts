import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

import { RecipeServiceProvider } from '../../providers/recipe-service/recipe-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-export',
  templateUrl: 'export.html',
})
export class ExportPage {
  exportLinks: any;

  constructor(public navCtrl: NavController, public navParams: NavParams, public recipeService: RecipeServiceProvider) {
    this.exportLinks = {'json': '', 'xml': '', 'txt': '' };
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ExportPage');
    
    for (var key in this.exportLinks) {
      if (this.exportLinks.hasOwnProperty(key)) {
        this.exportLinks[key] = this.getExportURL(key);
      }
    }
  }
  
  getExportURL(format) {
    return this.recipeService.getExportURL(format);
  }
}
