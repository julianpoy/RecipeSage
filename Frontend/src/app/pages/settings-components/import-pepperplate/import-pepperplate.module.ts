import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ImportPepperplatePage } from './import-pepperplate.page';

@NgModule({
  declarations: [
    ImportPepperplatePage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ImportPepperplatePage
      }
    ])
  ],
})
export class ImportPepperplatePageModule {}
