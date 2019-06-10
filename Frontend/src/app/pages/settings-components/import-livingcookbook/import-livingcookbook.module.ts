import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ImportLivingcookbookPage } from './import-livingcookbook.page';

@NgModule({
  declarations: [
    ImportLivingcookbookPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ImportLivingcookbookPage
      }
    ])
  ],
})
export class ImportLivingcookbookPageModule {}
