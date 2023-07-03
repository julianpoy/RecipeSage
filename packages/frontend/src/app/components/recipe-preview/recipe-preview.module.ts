import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";

import { RecipePreviewComponent } from "./recipe-preview.component";
import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [RecipePreviewComponent],
  imports: [CommonModule, IonicModule, GlobalModule],
  exports: [RecipePreviewComponent],
})
export class RecipePreviewModule {}
