import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { HomePage } from './home';
import { PipesModule } from './../../pipes/pipes.module';

import { VirtualScrollerModule } from 'ngx-virtual-scroller';

@NgModule({
  declarations: [
    HomePage,
  ],
  imports: [
    IonicPageModule.forChild(HomePage),
    PipesModule,
    VirtualScrollerModule
  ],
})
export class HomePageModule {}
