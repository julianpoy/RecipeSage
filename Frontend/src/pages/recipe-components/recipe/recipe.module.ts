import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { RecipePage } from './recipe';
import { PipesModule } from './../../../pipes/pipes.module';

@NgModule({
  declarations: [
    RecipePage,
  ],
  imports: [
    PipesModule,
    IonicPageModule.forChild(RecipePage),
  ],
})
export class RecipePageModule {}
