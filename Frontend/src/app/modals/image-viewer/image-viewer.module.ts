import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ImageViewerComponent } from './image-viewer.component';

@NgModule({
  declarations: [
    ImageViewerComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    ImageViewerComponent
  ],
  entryComponents: [
    ImageViewerComponent
  ]
})
export class ImageViewerModule { }
