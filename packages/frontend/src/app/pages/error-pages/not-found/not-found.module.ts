import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { NotFoundPage } from './not-found.page';
import { NullStateModule } from '~/components/null-state/null-state.module';
import { GlobalModule } from '~/global.module';

@NgModule({
  declarations: [
    NotFoundPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: NotFoundPage
      }
    ]),
    GlobalModule,
    NullStateModule
  ],
})
export class NotFoundPageModule {}
