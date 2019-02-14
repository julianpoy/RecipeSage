import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ContributePage } from './contribute';
import { ComponentsModule } from '../../../components/components.module';

@NgModule({
  declarations: [
    ContributePage,
  ],
  imports: [
    IonicPageModule.forChild(ContributePage),
    ComponentsModule
  ],
})
export class ContributePageModule {}
