import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { CopyWithWebshareComponent } from './copy-with-webshare.component';

@NgModule({
  declarations: [
    CopyWithWebshareComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    CopyWithWebshareComponent
  ]
})
export class CopyWithWebshareModule { }
