import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { RecipePage } from './recipe.page';

import { PipesModule } from '@/pipes/pipes.module';
import { RecipeDetailsPopoverPageModule } from '../recipe-details-popover/recipe-details-popover.module';
import { AddRecipeToShoppingListModalPageModule } from '../add-recipe-to-shopping-list-modal/add-recipe-to-shopping-list-modal.module';
import { AddRecipeToMealPlanModalPageModule } from '../add-recipe-to-meal-plan-modal/add-recipe-to-meal-plan-modal.module';
import { PrintRecipeModalPageModule } from '../print-recipe-modal/print-recipe-modal.module';
import { ShareModalPageModule } from '@/pages/share-modal/share-modal.module';
import { ImageViewerModule } from '@/modals/image-viewer/image-viewer.module';
import { ScaleRecipeModule } from '@/modals/scale-recipe/scale-recipe.module';
import { GlobalModule } from '@/global.module';
import {RatingModule} from '@/components/rating/rating.module';

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
    GlobalModule,
    RecipeDetailsPopoverPageModule,
    AddRecipeToShoppingListModalPageModule,
    AddRecipeToMealPlanModalPageModule,
    PrintRecipeModalPageModule,
    ShareModalPageModule,
    ImageViewerModule,
    ScaleRecipeModule,
    RatingModule,
  ],
})
export class RecipePageModule {}
