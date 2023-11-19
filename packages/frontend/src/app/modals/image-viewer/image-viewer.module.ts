import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";

import { ImageViewerComponent } from "./image-viewer.component";
import { GlobalModule } from "~/global.module";

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  declarations: [ImageViewerComponent],
  imports: [CommonModule, IonicModule, GlobalModule],
  exports: [ImageViewerComponent],
})
export class ImageViewerModule {}
