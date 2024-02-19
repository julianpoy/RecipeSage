import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { IonicModule } from "@ionic/angular";

import { SignInWithGoogleComponent } from "./sign-in-with-google.component";
import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [SignInWithGoogleComponent],
  imports: [CommonModule, IonicModule, RouterModule, GlobalModule],
  exports: [SignInWithGoogleComponent],
})
export class SignInWithGoogleModule {}
