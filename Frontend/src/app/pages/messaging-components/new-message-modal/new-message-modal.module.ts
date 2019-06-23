import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NewMessageModalPage } from './new-message-modal.page';

@NgModule({
  declarations: [
    NewMessageModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  entryComponents: [
    NewMessageModalPage,
  ],
})
export class NewMessageModalPageModule {}
