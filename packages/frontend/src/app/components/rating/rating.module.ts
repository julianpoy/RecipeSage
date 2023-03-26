import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { RatingComponent } from './rating.component';
import {GlobalModule} from '~/global.module';

@NgModule({
  declarations: [
    RatingComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    GlobalModule,
  ],
  exports: [
    RatingComponent
  ]
})
export class RatingModule { }
