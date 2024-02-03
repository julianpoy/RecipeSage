import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";

import { ImportCookmatePage } from "./import-cookmate.page";

import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [ImportCookmatePage],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: "",
        component: ImportCookmatePage,
      },
    ]),
  ],
})
export class ImportCookmatePageModule {}
