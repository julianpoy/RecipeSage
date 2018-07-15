import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { NewShoppingListModalPage } from './new-shopping-list-modal';
import { PipesModule } from './../../../pipes/pipes.module';

@NgModule({
  declarations: [
    NewShoppingListModalPage,
  ],
  imports: [
    PipesModule,
    IonicPageModule.forChild(NewShoppingListModalPage),
  ],
})
export class NewShoppingListModalPageModule {}
