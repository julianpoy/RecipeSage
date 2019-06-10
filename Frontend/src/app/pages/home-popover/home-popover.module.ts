import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { HomePopoverPage } from './home-popover.page';

@NgModule({
  declarations: [
    HomePopoverPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: HomePopoverPage
      }
    ])
  ],
})
export class HomePopoverPageModule {}
