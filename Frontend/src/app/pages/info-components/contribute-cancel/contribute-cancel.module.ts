import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ContributeCancelPage } from './contribute-cancel.page';

@NgModule({
  declarations: [
    ContributeCancelPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ContributeCancelPage
      }
    ])
  ],
})
export class ContributeCancelPageModule {}
