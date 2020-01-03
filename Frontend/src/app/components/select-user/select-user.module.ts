import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { SelectUserComponent } from './select-user.component';

@NgModule({
  declarations: [
    SelectUserComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
  ],
  exports: [
    SelectUserComponent
  ]
})
export class SelectUserModule { }
