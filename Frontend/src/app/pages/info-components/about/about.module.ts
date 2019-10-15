import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { AboutPage } from './about.page';
import { SocialLinksModule } from '@/components/social-links/social-links.module';

@NgModule({
  declarations: [
    AboutPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: AboutPage
      }
    ]),
    SocialLinksModule
  ],
})
export class AboutPageModule {}
