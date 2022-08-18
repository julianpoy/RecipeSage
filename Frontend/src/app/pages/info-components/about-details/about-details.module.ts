import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { AboutDetailsPage } from './about-details.page';
import { SocialLinksModule } from '@/components/social-links/social-links.module';
import {GlobalModule} from '@/global.module';

@NgModule({
  declarations: [
    AboutDetailsPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: AboutDetailsPage
      }
    ]),
    SocialLinksModule,
    GlobalModule
  ],
})
export class AboutDetailsPageModule {}
