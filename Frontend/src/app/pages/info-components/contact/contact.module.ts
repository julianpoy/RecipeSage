import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ContactPage } from './contact.page';
import { SocialLinksModule } from '@/components/social-links/social-links.module';

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
    SocialLinksModule
  ],
})
export class ContactPageModule {}
