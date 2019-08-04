import { Component } from '@angular/core';

import { RecipeService } from '@/services/recipe.service';
import { RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-export',
  templateUrl: 'export.page.html',
  styleUrls: ['export.page.scss']
})
export class ExportPage {
  defaultBackHref: string = RouteMap.SettingsPage.getPath();

  constructor(public recipeService: RecipeService) {}

  getExportURL(format) {
    return this.recipeService.getExportURL(format);
  }

  export(format) {
    const exportUrl = this.getExportURL(format);
    window.open(exportUrl);
  }

  exportAsJSON() {
    this.export('json');
  }

  exportAsXML() {
    this.export('xml');
  }

  exportAsTXT() {
    this.export('txt');
  }
}
