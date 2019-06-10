import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { SettingsPage } from './settings.page';

@NgModule({
  declarations: [
    SettingsPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: SettingsPage
      }
    ])
  ],
})
export class SettingsPageModule {}
