import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";

import { GlobalModule } from "~/global.module";
import { ManageLabelGroupModalPage } from "./manage-label-group-modal.page";
import { SelectMultipleItemsModule } from "../../../components/select-multiple-items/select-multiple-items.module";

@NgModule({
  declarations: [ManageLabelGroupModalPage],
  imports: [CommonModule, IonicModule, GlobalModule, SelectMultipleItemsModule],
})
export class ManageLabelGroupModalPageModule {}
