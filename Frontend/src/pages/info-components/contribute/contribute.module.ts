import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ContributePage } from './contribute';

@NgModule({
  declarations: [
    ContributePage,
  ],
  imports: [
    IonicPageModule.forChild(ContributePage),
  ],
})
export class ContributePageModule {}
