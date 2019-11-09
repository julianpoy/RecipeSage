import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { SocialLinksComponent } from './social-links.component';

@NgModule({
  declarations: [
    SocialLinksComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    SocialLinksComponent
  ]
})
export class SocialLinksModule { }
