import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ContactPage } from './contact.page';
import { SocialLinksModule } from '@/components/social-links/social-links.module';

import { GlobalModule } from '@/global.module';

@NgModule({
  declarations: [
    ContactPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ContactPage
      }
    ]),
    GlobalModule,
    SocialLinksModule
  ],
})
export class ContactPageModule {}
