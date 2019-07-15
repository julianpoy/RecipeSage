import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { HomePage } from './home.page';
import { LogoIconModule } from '@/components/logo-icon/logo-icon.module';
import { HomePopoverPageModule } from '@/pages/home-popover/home-popover.module';

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
    HomePopoverPageModule,
  ],
  declarations: [HomePage]
})
export class HomePageModule {}
