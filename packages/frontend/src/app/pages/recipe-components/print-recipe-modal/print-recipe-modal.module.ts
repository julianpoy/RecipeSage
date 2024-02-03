import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";

import { PrintRecipeModalPage } from "./print-recipe-modal.page";
import { RecipePreviewModule } from "~/components/recipe-preview/recipe-preview.module";

import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [PrintRecipeModalPage],
  imports: [GlobalModule, CommonModule, IonicModule, RecipePreviewModule],
})
export class PrintRecipeModalPageModule {}
