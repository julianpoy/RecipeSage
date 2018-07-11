import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { AccountPage } from './account';

@NgModule({
  declarations: [
    AccountPage,
  ],
  imports: [
    IonicPageModule.forChild(AccountPage),
  ],
})
export class AccountPageModule {}
