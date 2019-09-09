import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ExportPage } from './export.page';

@NgModule({
  declarations: [
    ExportPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ExportPage
      }
    ])
  ],
})
export class ExportPageModule {}
