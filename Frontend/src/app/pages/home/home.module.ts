import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { UiScrollModule } from 'ngx-ui-scroll';

import { HomePage } from './home.page';
import { LogoIconModule } from '@/components/logo-icon/logo-icon.module';
import { HomePopoverPageModule } from '@/pages/home-popover/home-popover.module';
import { NullStateModule } from '@/components/null-state/null-state.module';

import { GlobalModule } from '@/global.module';

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
    GlobalModule,
    LogoIconModule,
    NullStateModule,
    HomePopoverPageModule,
    UiScrollModule,
  ],
  declarations: [HomePage]
})
export class HomePageModule {}
