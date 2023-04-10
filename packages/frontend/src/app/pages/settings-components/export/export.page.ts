import { Component } from '@angular/core';

import { RecipeService, ExportFormat } from '~/services/recipe.service';
import { RouteMap } from '~/services/util.service';

@Component({
  selector: 'page-export',
  templateUrl: 'export.page.html',
  styleUrls: ['export.page.scss']
})
export class ExportPage {
  defaultBackHref: string = RouteMap.SettingsPage.getPath();

  constructor(public recipeService: RecipeService) {}

  getExportURL(format: ExportFormat) {
    return this.recipeService.getExportURL(format);
  }

  export(format: ExportFormat) {
    const exportUrl = this.getExportURL(format);
    window.open(exportUrl);
  }

  exportAsJSONLD() {
    this.export(ExportFormat.JSONLD);
  }

  exportAsXML() {
    this.export(ExportFormat.XML);
  }

  exportAsTXT() {
    this.export(ExportFormat.TXT);
  }

  exportAsPDF() {
    this.export(ExportFormat.PDF);
  }
}
