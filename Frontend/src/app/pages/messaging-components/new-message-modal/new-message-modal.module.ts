import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NewMessageModalPage } from './new-message-modal.page';
import { SelectUserModule } from '@/components/select-user/select-user.module';

@NgModule({
  declarations: [
    NewMessageModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    SelectUserModule,
  ],
  entryComponents: [
    NewMessageModalPage,
  ],
})
export class NewMessageModalPageModule {}
