import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ReleaseNotesPage } from './release-notes';

@NgModule({
  declarations: [
    ReleaseNotesPage,
  ],
  imports: [
    IonicPageModule.forChild(ReleaseNotesPage),
  ],
})
export class ReleaseNotesPageModule {}
