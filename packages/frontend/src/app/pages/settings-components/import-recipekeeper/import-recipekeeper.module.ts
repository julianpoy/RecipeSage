import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";

import { ImportRecipeKeeperPage } from "./import-recipekeeper.page";

import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [ImportRecipeKeeperPage],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: "",
        component: ImportRecipeKeeperPage,
      },
    ]),
  ],
})
export class ImportRecipeKeeperPageModule {}
