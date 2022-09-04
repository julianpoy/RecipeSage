import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { MultiImageUploadComponent } from './multi-image-upload.component';
import {GlobalModule} from '@/global.module';

@NgModule({
  declarations: [
    MultiImageUploadComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    GlobalModule,
  ],
  exports: [
    MultiImageUploadComponent
  ]
})
export class MultiImageUploadModule { }
