import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { RecipePage } from './recipe.page';

import { PipesModule } from '@/pipes/pipes.module';
import { AddRecipeToShoppingListModalPageModule } from '../add-recipe-to-shopping-list-modal/add-recipe-to-shopping-list-modal.module';
import { AddRecipeToMealPlanModalPageModule } from '../add-recipe-to-meal-plan-modal/add-recipe-to-meal-plan-modal.module';
import { PrintRecipeModalPageModule } from '../print-recipe-modal/print-recipe-modal.module';
import { ShareModalPageModule } from '@/pages/share-modal/share-modal.module';
import { AuthModalPageModule } from '@/pages/auth-modal/auth-modal.module';
import { ImageViewerModule } from '@/modals/image-viewer/image-viewer.module';

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
    PipesModule,
    AddRecipeToShoppingListModalPageModule,
    AddRecipeToMealPlanModalPageModule,
    PrintRecipeModalPageModule,
    ShareModalPageModule,
    AuthModalPageModule,
    ImageViewerModule,
  ],
})
export class RecipePageModule {}
