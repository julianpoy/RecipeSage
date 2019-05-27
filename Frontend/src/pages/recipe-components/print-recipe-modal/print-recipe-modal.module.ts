import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { PrintRecipeModalPage } from './print-recipe-modal';
import { ComponentsModule } from '../../../components/components.module';

@NgModule({
  declarations: [
    PrintRecipeModalPage,
  ],
  imports: [
    IonicPageModule.forChild(PrintRecipeModalPage),
    ComponentsModule
  ],
})
export class PrintRecipeModalPageModule {}
