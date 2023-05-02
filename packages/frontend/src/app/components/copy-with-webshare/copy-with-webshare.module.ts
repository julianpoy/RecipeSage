import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CopyWithWebshareComponent } from './copy-with-webshare.component';
import {GlobalModule} from '~/global.module';

@NgModule({
  declarations: [
    CopyWithWebshareComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    GlobalModule,
  ],
  exports: [
    CopyWithWebshareComponent
  ]
})
export class CopyWithWebshareModule { }
