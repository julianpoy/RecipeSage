import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { DownloadAndInstallPage } from './download-and-install.page';

import { GlobalModule } from '~/global.module';

@NgModule({
  declarations: [
    DownloadAndInstallPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: DownloadAndInstallPage
      }
    ]),
    GlobalModule,
  ],
})
export class DownloadAndInstallPageModule {}
