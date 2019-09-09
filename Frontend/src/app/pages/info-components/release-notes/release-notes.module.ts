import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ReleaseNotesPage } from './release-notes.page';

@NgModule({
  declarations: [
    ReleaseNotesPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ReleaseNotesPage
      }
    ])
  ],
})
export class ReleaseNotesPageModule {}
