import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { EditRecipePage } from "./edit-recipe.page";
import { MultiImageUploadModule } from "../../../components/multi-image-upload/multi-image-upload.module";
import { RatingModule } from "~/components/rating/rating.module";
import { EditRecipePopoverPageModule } from "../edit-recipe-popover/edit-recipe-popover.module";

import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [EditRecipePage],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      {
        path: "",
        component: EditRecipePage,
      },
    ]),
    MultiImageUploadModule,
    EditRecipePopoverPageModule,
    RatingModule,
  ],
})
export class EditRecipePageModule {}
