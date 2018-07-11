import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { NewMessageModalPage } from './new-message-modal';

@NgModule({
  declarations: [
    NewMessageModalPage,
  ],
  imports: [
    IonicPageModule.forChild(NewMessageModalPage),
  ],
})
export class NewMessageModalPageModule {}
