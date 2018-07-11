import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { MessageThreadPage } from './message-thread';

@NgModule({
  declarations: [
    MessageThreadPage,
  ],
  imports: [
    IonicPageModule.forChild(MessageThreadPage),
  ],
})
export class MessageThreadPageModule {}
