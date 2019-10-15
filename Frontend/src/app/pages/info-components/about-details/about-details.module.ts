import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { AboutDetailsPage } from './about-details.page';
import { SocialLinksModule } from '@/components/social-links/social-links.module';

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
    SocialLinksModule
  ],
})
export class AboutDetailsPageModule {}
