import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";

import { GlobalModule } from "~/global.module";
import { NewLabelItemModalPage } from "./new-label-item-modal.page";
import { SelectMultipleItemsModule } from "../../../components/select-multiple-items/select-multiple-items.module";

@NgModule({
  declarations: [NewLabelItemModalPage],
  imports: [CommonModule, IonicModule, GlobalModule, SelectMultipleItemsModule],
})
export class NewLabelItemModalPageModule {}
