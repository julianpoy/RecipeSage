import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ImportJSONLDPage } from './import-json-ld.page';

import { GlobalModule } from '@/global.module';

@NgModule({
  declarations: [
    ImportJSONLDPage,
  ],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ImportJSONLDPage
      }
    ])
  ],
})
export class ImportJSONLDPageModule {}
