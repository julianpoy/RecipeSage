import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { NewShoppingListModalPage } from './new-shopping-list-modal';
import { ComponentsModule } from '../../../components/components.module';

@NgModule({
  declarations: [
    NewShoppingListModalPage,
  ],
  imports: [
    ComponentsModule,
    IonicPageModule.forChild(NewShoppingListModalPage),
  ],
})
export class NewShoppingListModalPageModule {}
