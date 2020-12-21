import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ProfilePage } from './profile.page';
import { NullStateModule } from '../../../components/null-state/null-state.module';
import { ImageViewerModule } from '@/modals/image-viewer/image-viewer.module';

@NgModule({
  declarations: [
    ProfilePage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ProfilePage
      }
    ]),
    FormsModule,
    ReactiveFormsModule,
    NullStateModule,
    ImageViewerModule,
  ],
})
export class ProfilePageModule {}
