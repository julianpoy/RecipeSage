import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";

import { ShoppingListIgnoreModalPage } from "./shopping-list-ignore-modal.page";
import { SelectCollaboratorsModule } from "~/components/select-collaborators/select-collaborators.module";
import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [ShoppingListIgnoreModalPage],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    SelectCollaboratorsModule,
    GlobalModule,
  ],
})
export class ShoppingListIgnoreModalPageModule {}
