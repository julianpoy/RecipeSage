import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MyProfilePage } from './my-profile.page';
import { AddProfileItemModalModule } from '../add-profile-item-modal/add-profile-item-modal.module';
import { ShareProfileModalPageModule } from '../share-profile-modal/share-profile-modal.module';
import { MultiImageUploadModule } from '../../../components/multi-image-upload/multi-image-upload.module';
import { NullStateModule } from '../../../components/null-state/null-state.module';
import {GlobalModule} from '@/global.module';

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
    ShareProfileModalPageModule,
    MultiImageUploadModule,
    NullStateModule,
    GlobalModule
  ],
})
export class MyProfilePageModule {}
