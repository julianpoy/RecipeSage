import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";

import { ManageLabelModalPage } from "./manage-label-modal.page";

import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [ManageLabelModalPage],
  imports: [CommonModule, IonicModule, GlobalModule],
  entryComponents: [ManageLabelModalPage],
})
export class ManageLabelModalPageModule {}
