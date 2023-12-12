import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";

import { SelectLabelComponent } from "./select-label.component";
import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [SelectLabelComponent],
  imports: [CommonModule, IonicModule, GlobalModule],
  exports: [SelectLabelComponent],
})
export class SelectLabelModule {}
