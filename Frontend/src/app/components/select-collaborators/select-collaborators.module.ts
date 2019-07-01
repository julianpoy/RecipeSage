import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PipesModule } from '@/pipes/pipes.module';
import { SelectCollaboratorsComponent } from './select-collaborators.component';

@NgModule({
  declarations: [
    SelectCollaboratorsComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    PipesModule,
  ],
  exports: [
    SelectCollaboratorsComponent
  ]
})
export class SelectCollaboratorsModule { }
