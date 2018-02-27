import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { HomePopoverPage } from './home-popover';

@NgModule({
  declarations: [
    HomePopoverPage,
  ],
  imports: [
    IonicPageModule.forChild(HomePopoverPage),
  ],
})
export class HomePopoverPageModule {}
