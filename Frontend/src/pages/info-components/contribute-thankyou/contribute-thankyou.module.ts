import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ContributeThankYouPage } from './contribute-thankyou';
import { ComponentsModule } from '../../../components/components.module';

@NgModule({
  declarations: [
    ContributeThankYouPage,
  ],
  imports: [
    IonicPageModule.forChild(ContributeThankYouPage),
    ComponentsModule
  ],
})
export class ContributeThankYouPageModule {}
