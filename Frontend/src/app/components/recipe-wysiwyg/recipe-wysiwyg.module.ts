import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NgxTiptapModule } from 'ngx-tiptap';

import { RecipeWysiwygComponent } from './recipe-wysiwyg.component';
import {GlobalModule} from '@/global.module';

@NgModule({
  declarations: [
    RecipeWysiwygComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    GlobalModule,
    FormsModule,
    ReactiveFormsModule,
    NgxTiptapModule,
  ],
  exports: [
    RecipeWysiwygComponent
  ]
})
export class RecipeWysiwygModule { }
