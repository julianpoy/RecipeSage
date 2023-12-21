import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";

import { SelectMultipleItemsComponent } from "./select-multiple-items.component";
import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [SelectMultipleItemsComponent],
  imports: [CommonModule, IonicModule, GlobalModule],
  exports: [SelectMultipleItemsComponent],
})
export class SelectMultipleItemsModule {}
