import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { LogoIconComponent } from './logo-icon.component';
import {GlobalModule} from '~/global.module';

@NgModule({
  declarations: [
    LogoIconComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    GlobalModule,
  ],
  exports: [
    LogoIconComponent
  ]
})
export class LogoIconModule { }
