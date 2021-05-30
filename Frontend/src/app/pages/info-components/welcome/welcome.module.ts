import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { WelcomePage } from './welcome.page';

import { GlobalModule } from '@/global.module';

@NgModule({
  declarations: [
    WelcomePage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: WelcomePage
      }
    ]),
    GlobalModule,
  ],
})
export class WelcomePageModule {}
