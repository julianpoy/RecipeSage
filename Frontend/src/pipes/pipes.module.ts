import { NgModule } from '@angular/core';
import { BasicFilterPipe } from './basic-filter/basic-filter';
import { LabelAutocompleteFilterPipe } from './label-autocomplete-filter/label-autocomplete-filter';
import { ShoppingListCollaboratorFilterPipe } from './shopping-list-collaborator-filter/shopping-list-collaborator-filter';
@NgModule({
	declarations: [
		BasicFilterPipe,
		LabelAutocompleteFilterPipe,
    ShoppingListCollaboratorFilterPipe
	],
	imports: [],
	exports: [
		BasicFilterPipe,
		LabelAutocompleteFilterPipe,
    ShoppingListCollaboratorFilterPipe
	]
})
export class PipesModule {}
