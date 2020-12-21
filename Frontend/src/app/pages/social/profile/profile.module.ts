import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ProfilePage } from './profile.page';
import { NullStateModule } from '../../../components/null-state/null-state.module';

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
  ],
})
export class ProfilePageModule {}
