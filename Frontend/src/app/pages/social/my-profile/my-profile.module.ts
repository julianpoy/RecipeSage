import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MyProfilePage } from './my-profile.page';
import { AddProfileItemModalModule } from '../add-profile-item-modal/add-profile-item-modal.module';
import { MultiImageUploadModule } from '../../../components/multi-image-upload/multi-image-upload.module';
import { NullStateModule } from '../../../components/null-state/null-state.module';

@NgModule({
  declarations: [
    MyProfilePage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: MyProfilePage
      }
    ]),
    FormsModule,
    ReactiveFormsModule,
    AddProfileItemModalModule,
    MultiImageUploadModule,
    NullStateModule,
  ],
})
export class MyProfilePageModule {}
