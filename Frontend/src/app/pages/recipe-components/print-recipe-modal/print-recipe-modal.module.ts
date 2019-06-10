import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { PrintRecipeModalPage } from './print-recipe-modal.page';
// import { ComponentsModule } from '@/components/components.module';

@NgModule({
  declarations: [
    PrintRecipeModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: PrintRecipeModalPage
      }
    ]),
    ComponentsModule
  ],
})
export class PrintRecipeModalPageModule {}
