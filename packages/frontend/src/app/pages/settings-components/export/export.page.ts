import { Component } from "@angular/core";

import { RecipeService, ExportFormat } from "~/services/recipe.service";
import { RouteMap } from "~/services/util.service";
import { UserService } from "../../../services/user.service";

@Component({
  selector: "page-export",
  templateUrl: "export.page.html",
  styleUrls: ["export.page.scss"],
})
export class ExportPage {
  defaultBackHref: string = RouteMap.SettingsPage.getPath();

  constructor(
    private userService: UserService,
    private recipeService: RecipeService,
  ) {}

  ionViewWillEnter() {}

  getExportURL(format: ExportFormat) {
    return this.recipeService.getExportURL(format);
  }

  export(format: ExportFormat) {
    const exportUrl = this.getExportURL(format);
    window.open(exportUrl);
  }

  async exportAsJSONLD() {
    // Fetch user account to validate user is logged in
    const me = await this.userService.me();
    if (!me.success) return;

    this.export(ExportFormat.JSONLD);
  }

  async exportAsXML() {
    const me = await this.userService.me();
    if (!me.success) return;

    this.export(ExportFormat.XML);
  }

  async exportAsTXT() {
    const me = await this.userService.me();
    if (!me.success) return;

    this.export(ExportFormat.TXT);
  }

  async exportAsPDF() {
    const me = await this.userService.me();
    if (!me.success) return;

    this.export(ExportFormat.PDF);
  }
}
