import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { BasicFilterPipe } from './basic-filter.pipe';
import { LabelAutocompleteFilterPipe } from './label-autocomplete-filter.pipe';
import { ShoppingListCollaboratorFilterPipe } from './shopping-list-collaborator-filter.pipe';

@NgModule({
  declarations: [
    BasicFilterPipe,
    LabelAutocompleteFilterPipe,
    ShoppingListCollaboratorFilterPipe
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    BasicFilterPipe,
    LabelAutocompleteFilterPipe,
    ShoppingListCollaboratorFilterPipe
  ]
})
export class PipesModule { }
