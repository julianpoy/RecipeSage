import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PeoplePage } from './people.page';

@NgModule({
  declarations: [
    PeoplePage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: PeoplePage
      }
    ]),
    FormsModule,
    ReactiveFormsModule
  ],
})
export class PeoplePageModule {}
