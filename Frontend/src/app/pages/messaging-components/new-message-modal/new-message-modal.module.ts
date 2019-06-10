import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { NewMessageModalPage } from './new-message-modal.page';

@NgModule({
  declarations: [
    NewMessageModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: NewMessageModalPage
      }
    ])
  ],
})
export class NewMessageModalPageModule {}
