import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { PrintRecipeModalPage } from './print-recipe-modal.page';

@NgModule({
  declarations: [
    PrintRecipeModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
  ],
  entryComponents: [
    PrintRecipeModalPage,
  ],
})
export class PrintRecipeModalPageModule {}
