import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { AuthPage } from './auth.page';

@NgModule({
  declarations: [
    AuthPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: AuthPage
      }
    ])
  ],
})
export class AuthPageModule {}
