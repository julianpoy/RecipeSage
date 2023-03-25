import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { SocialLinksComponent } from './social-links.component';
import {GlobalModule} from '@/global.module';

@NgModule({
  declarations: [
    SocialLinksComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    GlobalModule
  ],
  exports: [
    SocialLinksComponent
  ]
})
export class SocialLinksModule { }
