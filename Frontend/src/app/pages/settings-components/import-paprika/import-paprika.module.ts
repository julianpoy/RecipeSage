import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ImportPaprikaPage } from './import-paprika.page';

@NgModule({
  declarations: [
    ImportPaprikaPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ImportPaprikaPage
      }
    ])
  ],
})
export class ImportPaprikaPageModule {}
