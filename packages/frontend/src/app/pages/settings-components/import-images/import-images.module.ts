import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";

import { ImportImagesPage } from "./import-images.page";

import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [ImportImagesPage],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: "",
        component: ImportImagesPage,
      },
    ]),
  ],
})
export class ImportImagesPageModule {}
