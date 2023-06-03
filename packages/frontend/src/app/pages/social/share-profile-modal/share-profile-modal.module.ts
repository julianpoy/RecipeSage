import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";

import { ShareProfileModalPage } from "./share-profile-modal.page";
import { GlobalModule } from "~/global.module";
import { CopyWithWebshareModule } from "~/components/copy-with-webshare/copy-with-webshare.module";

@NgModule({
  declarations: [ShareProfileModalPage],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    GlobalModule,
    CopyWithWebshareModule,
  ],
  entryComponents: [ShareProfileModalPage],
})
export class ShareProfileModalPageModule {}
