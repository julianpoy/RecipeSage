import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { LoginModalPage } from './login-modal.page';

@NgModule({
  declarations: [
    LoginModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
  ],
  entryComponents: [
    LoginModalPage
  ]
})
export class LoginModalPageModule {}
