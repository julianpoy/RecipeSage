import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { LogoIconComponent } from './logo-icon.component';

@NgModule({
  declarations: [
    LogoIconComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    LogoIconComponent
  ]
})
export class LogoIconModule { }
