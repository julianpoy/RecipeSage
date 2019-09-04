import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { AuthModalPage } from './auth-modal.page';

@NgModule({
  declarations: [
    AuthModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
  ],
  entryComponents: [
    AuthModalPage
  ]
})
export class AuthModalPageModule {}
