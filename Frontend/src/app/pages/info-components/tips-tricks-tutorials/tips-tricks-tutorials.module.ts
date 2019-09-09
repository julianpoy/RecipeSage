import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { TipsTricksTutorialsPage } from './tips-tricks-tutorials.page';

@NgModule({
  declarations: [
    TipsTricksTutorialsPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: TipsTricksTutorialsPage
      }
    ])
  ],
})
export class TipsTricksTutorialsPageModule {}
