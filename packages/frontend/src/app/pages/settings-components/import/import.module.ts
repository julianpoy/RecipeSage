import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ImportPage } from './import.page';

import { GlobalModule } from '~/global.module';

@NgModule({
  declarations: [
    ImportPage,
  ],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ImportPage
      }
    ])
  ],
})
export class ImportPageModule {}
