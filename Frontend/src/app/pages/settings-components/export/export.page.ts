import { Component } from '@angular/core';

import { RecipeService } from '@/services/recipe.service';

@Component({
  selector: 'page-export',
  templateUrl: 'export.page.html',
  styleUrls: ['export.page.scss']
})
export class ExportPage {
  exportLinks: any;

  constructor(public recipeService: RecipeService) {
    this.exportLinks = {'json': '', 'xml': '', 'txt': '' };
  }

  ionViewDidLoad() {
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
