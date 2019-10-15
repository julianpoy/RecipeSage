import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ImportPage } from './import.page';

@NgModule({
  declarations: [
    ImportPage,
  ],
  imports: [
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
