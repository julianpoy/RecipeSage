import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CopyWithWebshareComponent } from './copy-with-webshare.component';

@NgModule({
  declarations: [
    CopyWithWebshareComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [
    CopyWithWebshareComponent
  ]
})
export class CopyWithWebshareModule { }
