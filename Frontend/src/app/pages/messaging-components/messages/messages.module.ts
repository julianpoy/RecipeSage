import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { MessagesPage } from './messages.page';

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
    ])
  ],
})
export class MessagesPageModule {}
