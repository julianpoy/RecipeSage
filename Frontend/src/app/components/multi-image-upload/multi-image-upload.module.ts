import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { MultiImageUploadComponent } from './multi-image-upload.component';

@NgModule({
  declarations: [
    MultiImageUploadComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
  ],
  exports: [
    MultiImageUploadComponent
  ]
})
export class MultiImageUploadModule { }
