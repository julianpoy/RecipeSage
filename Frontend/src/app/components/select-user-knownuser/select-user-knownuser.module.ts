import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import {GlobalModule} from '@/global.module';
import {SelectUserKnownUserComponent} from './select-user-knownuser.component';
import {SelectUserModule} from '../select-user/select-user.module';
import {SelectKnownUserModule} from '../select-knownuser/select-knownuser.module';

@NgModule({
  declarations: [
    SelectUserKnownUserComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    GlobalModule,
    SelectUserModule,
    SelectKnownUserModule
  ],
  exports: [
    SelectUserKnownUserComponent
  ]
})
export class SelectUserKnownUserModule { }
