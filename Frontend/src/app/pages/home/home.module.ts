import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { VirtualScrollerModule } from 'ngx-virtual-scroller';
import { UiScrollModule } from 'ngx-ui-scroll';

import { HomePage } from './home.page';
import { LogoIconModule } from '@/components/logo-icon/logo-icon.module';
import { HomePopoverPageModule } from '@/pages/home-popover/home-popover.module';
import { NullStateModule } from '@/components/null-state/null-state.module';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: HomePage
      }
    ]),
    LogoIconModule,
    NullStateModule,
    HomePopoverPageModule,
    VirtualScrollerModule,
    UiScrollModule,
  ],
  declarations: [HomePage]
})
export class HomePageModule {}
