import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { RecipePage } from './recipe';

import { TagInputModule } from 'ngx-chips';

@NgModule({
  declarations: [
    RecipePage,
  ],
  imports: [
    TagInputModule,
    IonicPageModule.forChild(RecipePage),
  ],
})
export class RecipePageModule {}
