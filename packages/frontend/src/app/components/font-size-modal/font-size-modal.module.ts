import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";

import { FontSizeModalComponent } from "./font-size-modal.component";
import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [FontSizeModalComponent],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    GlobalModule,
  ],
})
export class FontSizeModalModule {}
