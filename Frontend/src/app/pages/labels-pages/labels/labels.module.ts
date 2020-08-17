import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { VirtualScrollerModule } from 'ngx-virtual-scroller';

import { LabelsPage } from './labels.page';
import { LogoIconModule } from '@/components/logo-icon/logo-icon.module';
import { LabelsPopoverPageModule } from '@/pages/labels-pages/labels-popover/labels-popover.module';
import { ManageLabelModalPageModule } from '@/pages/labels-pages/manage-label-modal/manage-label-modal.module';
import { NullStateModule } from '@/components/null-state/null-state.module';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: LabelsPage
      }
    ]),
    LogoIconModule,
    NullStateModule,
    LabelsPopoverPageModule,
    ManageLabelModalPageModule,
    VirtualScrollerModule,
  ],
  declarations: [LabelsPage]
})
export class LabelsPageModule {}
