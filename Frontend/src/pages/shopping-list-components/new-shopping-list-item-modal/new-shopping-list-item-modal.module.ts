import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { NewShoppingListItemModalPage } from './new-shopping-list-item-modal';
import { PipesModule } from './../../../pipes/pipes.module';

@NgModule({
  declarations: [
    NewShoppingListItemModalPage,
  ],
  imports: [
    PipesModule,
    IonicPageModule.forChild(NewShoppingListItemModalPage),
  ],
})
export class NewShoppingListItemModalPageModule {}
