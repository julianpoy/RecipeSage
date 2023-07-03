import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";

import { LabelAutocompleteFilterPipe } from "./label-autocomplete-filter.pipe";
import { ShoppingListCollaboratorFilterPipe } from "./shopping-list-collaborator-filter.pipe";

@NgModule({
  declarations: [
    LabelAutocompleteFilterPipe,
    ShoppingListCollaboratorFilterPipe,
  ],
  imports: [CommonModule, IonicModule],
  exports: [LabelAutocompleteFilterPipe, ShoppingListCollaboratorFilterPipe],
})
export class PipesModule {}
