import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { SelectUserComponent } from './select-user.component';
import {GlobalModule} from '@/global.module';

@NgModule({
  declarations: [
    SelectUserComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    GlobalModule
  ],
  exports: [
    SelectUserComponent
  ]
})
export class SelectUserModule { }
