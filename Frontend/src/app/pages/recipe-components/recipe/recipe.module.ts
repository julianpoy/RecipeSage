import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { RecipePage } from './recipe.page';

import { PipesModule } from '@/pipes/pipes.module';

@NgModule({
  declarations: [
    RecipePage,
  ],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: RecipePage
      }
    ]),
    PipesModule
  ],
})
export class RecipePageModule {}
