import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ShareModalPage } from './share-modal';

@NgModule({
  declarations: [
    ShareModalPage,
  ],
  imports: [
    IonicPageModule.forChild(ShareModalPage),
  ],
})
export class ShareModalPageModule {}
