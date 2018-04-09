import { NgModule } from '@angular/core';
import { BasicFilterPipe } from './basic-filter/basic-filter';
import { LabelAutocompleteFilterPipe } from './label-autocomplete-filter/label-autocomplete-filter';
@NgModule({
	declarations: [
		BasicFilterPipe,
		LabelAutocompleteFilterPipe
	],
	imports: [],
	exports: [
		BasicFilterPipe,
		LabelAutocompleteFilterPipe
	]
})
export class PipesModule {}
