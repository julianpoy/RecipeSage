import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";

import { ImportUrlsPage } from "./import-urls.page";

import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [ImportUrlsPage],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: "",
        component: ImportUrlsPage,
      },
    ]),
  ],
})
export class ImportUrlsPageModule {}
