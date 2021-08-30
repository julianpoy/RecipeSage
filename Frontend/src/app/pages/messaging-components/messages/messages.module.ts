import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { MessagesPage } from './messages.page';
import { NewMessageModalPageModule } from '@/pages/messaging-components/new-message-modal/new-message-modal.module';
import { NullStateModule } from '@/components/null-state/null-state.module';

import { GlobalModule } from '@/global.module';

@NgModule({
  declarations: [
    MessagesPage,
  ],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: MessagesPage
      }
    ]),
    NewMessageModalPageModule,
    NullStateModule
  ]
})
export class MessagesPageModule {}
