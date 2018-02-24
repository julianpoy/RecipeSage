import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { RecipesByLabelPage } from './recipes-by-label';

import { LazyLoadImageModule } from 'ng-lazyload-image';

import { PipesModule } from '../../pipes/pipes.module';

@NgModule({
  declarations: [
    RecipesByLabelPage,
  ],
  imports: [
    IonicPageModule.forChild(RecipesByLabelPage),
    PipesModule,
    LazyLoadImageModule
  ],
})
export class RecipesByLabelPageModule {}
