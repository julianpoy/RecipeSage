import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { MessageThreadPage } from './message-thread.page';

@NgModule({
  declarations: [
    MessageThreadPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: MessageThreadPage
      }
    ])
  ],
})
export class MessageThreadPageModule {}
