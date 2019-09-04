import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { AboutDetailsPage } from './about-details.page';

@NgModule({
  declarations: [
    AboutDetailsPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: AboutDetailsPage
      }
    ])
  ],
})
export class AboutDetailsPageModule {}
