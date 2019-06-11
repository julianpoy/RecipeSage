import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ContributePage } from './contribute.page';

@NgModule({
  declarations: [
    ContributePage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ContributePage
      }
    ])
  ],
})
export class ContributePageModule {}
