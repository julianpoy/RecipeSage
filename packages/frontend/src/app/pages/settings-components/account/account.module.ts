import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AccountPage } from './account.page';

import { GlobalModule } from '~/global.module';

@NgModule({
  declarations: [
    AccountPage,
  ],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: AccountPage
      }
    ]),
    FormsModule,
    ReactiveFormsModule
  ],
})
export class AccountPageModule {}
