import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";

import { ImportPDFsPage } from "./import-pdfs.page";

import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [ImportPDFsPage],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: "",
        component: ImportPDFsPage,
      },
    ]),
  ],
})
export class ImportPDFsPageModule {}
