import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ShareModalPage } from './share-modal';
import { ComponentsModule } from '../../components/components.module';

@NgModule({
  declarations: [
    ShareModalPage,
  ],
  imports: [
    IonicPageModule.forChild(ShareModalPage),
    ComponentsModule
  ],
})
export class ShareModalPageModule {}
