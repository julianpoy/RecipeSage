import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { AccountPage } from './account.page';

@NgModule({
  declarations: [
    AccountPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: AccountPage
      }
    ])
  ],
})
export class AccountPageModule {}
