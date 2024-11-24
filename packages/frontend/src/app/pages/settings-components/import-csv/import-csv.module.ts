import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";

import { ImportCSVPage } from "./import-csv.page";

import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [ImportCSVPage],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: "",
        component: ImportCSVPage,
      },
    ]),
  ],
})
export class ImportCSVPageModule {}
