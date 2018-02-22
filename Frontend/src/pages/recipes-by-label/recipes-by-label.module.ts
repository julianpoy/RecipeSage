import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { RecipesByLabelPage } from './recipes-by-label';

@NgModule({
  declarations: [
    RecipesByLabelPage,
  ],
  imports: [
    IonicPageModule.forChild(RecipesByLabelPage),
  ],
})
export class RecipesByLabelPageModule {}
