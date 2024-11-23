import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";

import { ImportTextfilesPage } from "./import-textfiles.page";

import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [ImportTextfilesPage],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: "",
        component: ImportTextfilesPage,
      },
    ]),
  ],
})
export class ImportTextfilesPageModule {}
