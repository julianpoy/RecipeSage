import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { PrintRecipeModalPage } from './print-recipe-modal';

@NgModule({
  declarations: [
    PrintRecipeModalPage,
  ],
  imports: [
    IonicPageModule.forChild(PrintRecipeModalPage),
  ],
})
export class PrintRecipeModalPageModule {}
