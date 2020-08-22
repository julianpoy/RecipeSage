import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { CookingToolbarComponent } from './cooking-toolbar.component';

@NgModule({
  declarations: [
    CookingToolbarComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    CookingToolbarComponent
  ]
})
export class CookingToolbarModule { }
