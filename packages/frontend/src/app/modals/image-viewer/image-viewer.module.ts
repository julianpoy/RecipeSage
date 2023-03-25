import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ImageViewerComponent } from './image-viewer.component';
import {GlobalModule} from '@/global.module';

@NgModule({
  declarations: [
    ImageViewerComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    GlobalModule,
  ],
  exports: [
    ImageViewerComponent
  ],
  entryComponents: [
    ImageViewerComponent
  ]
})
export class ImageViewerModule { }
