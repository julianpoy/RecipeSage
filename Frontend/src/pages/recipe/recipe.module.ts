import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { RecipePage } from './recipe';

@NgModule({
  declarations: [
    RecipePage,
  ],
  imports: [
    IonicPageModule.forChild(RecipePage),
  ],
})
export class RecipePageModule {}
