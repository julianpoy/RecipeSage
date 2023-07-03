import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";

import { AboutPage } from "./about.page";
import { SocialLinksModule } from "~/components/social-links/social-links.module";

import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [AboutPage],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: "",
        component: AboutPage,
      },
    ]),
    GlobalModule,
    SocialLinksModule,
  ],
})
export class AboutPageModule {}
