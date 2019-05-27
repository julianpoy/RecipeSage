import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { PrintRecipePage } from './print-recipe';
import { PipesModule } from './../../../pipes/pipes.module';

@NgModule({
  declarations: [
    PrintRecipePage,
  ],
  imports: [
    PipesModule,
    IonicPageModule.forChild(PrintRecipePage),
  ],
})
export class PrintRecipePageModule {}
