import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ExportPage } from './export.page';

import { GlobalModule } from '@/global.module';

@NgModule({
  declarations: [
    ExportPage,
  ],
  imports: [
    GlobalModule,
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
