import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ContributeCancelPage } from './contribute-cancel';
import { ComponentsModule } from '../../../components/components.module';

@NgModule({
  declarations: [
    ContributeCancelPage,
  ],
  imports: [
    IonicPageModule.forChild(ContributeCancelPage),
    ComponentsModule
  ],
})
export class ContributeCancelPageModule {}
