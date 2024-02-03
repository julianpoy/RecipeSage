import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { IonicModule } from "@ionic/angular";

import { SelectKnownUserComponent } from "./select-knownuser.component";
import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [SelectKnownUserComponent],
  imports: [CommonModule, IonicModule, RouterModule, GlobalModule],
  exports: [SelectKnownUserComponent],
})
export class SelectKnownUserModule {}
