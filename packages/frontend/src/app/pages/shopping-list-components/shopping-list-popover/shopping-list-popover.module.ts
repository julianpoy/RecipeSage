import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { ShoppingListPopoverPage } from "./shopping-list-popover.page";
import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [ShoppingListPopoverPage],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    GlobalModule,
  ],
  entryComponents: [ShoppingListPopoverPage],
})
export class ShoppingListPopoverPageModule {}
