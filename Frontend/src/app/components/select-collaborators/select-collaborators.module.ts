import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { SelectCollaboratorsComponent } from './select-collaborators.component';

@NgModule({
  declarations: [
    SelectCollaboratorsComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    SelectCollaboratorsComponent
  ]
})
export class SelectCollaboratorsModule { }
