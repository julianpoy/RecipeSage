import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { MessagesPage } from './messages.page';
import { NewMessageModalPageModule } from '@/pages/messaging-components/new-message-modal/new-message-modal.module';

@NgModule({
  declarations: [
    MessagesPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: MessagesPage
      }
    ]),
    NewMessageModalPageModule
  ]
})
export class MessagesPageModule {}
