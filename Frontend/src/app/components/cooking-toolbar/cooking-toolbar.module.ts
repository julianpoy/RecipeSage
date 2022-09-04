import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { CookingToolbarComponent } from './cooking-toolbar.component';
import {GlobalModule} from '@/global.module';

@NgModule({
  declarations: [
    CookingToolbarComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    GlobalModule
  ],
  exports: [
    CookingToolbarComponent
  ]
})
export class CookingToolbarModule { }
