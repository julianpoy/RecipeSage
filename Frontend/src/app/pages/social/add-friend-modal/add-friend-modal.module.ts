import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AddFriendModalPage } from './add-friend-modal.page';
import { SelectUserModule } from '@/components/select-user/select-user.module';

@NgModule({
  declarations: [
    AddFriendModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    SelectUserModule
  ],
  entryComponents: [
    AddFriendModalPage,
  ],
})
export class AddFriendModalPageModule {}
