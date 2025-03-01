import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";

import { ImportEnexPage } from "./import-enex.page";

import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [ImportEnexPage],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: "",
        component: ImportEnexPage,
      },
    ]),
  ],
})
export class ImportEnexPageModule {}
