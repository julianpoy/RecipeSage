import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MyProfilePage } from './my-profile.page';

@NgModule({
  declarations: [
    MyProfilePage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: MyProfilePage
      }
    ]),
    FormsModule,
    ReactiveFormsModule
  ],
})
export class MyProfilePageModule {}
