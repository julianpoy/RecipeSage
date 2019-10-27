import { Component, Input } from '@angular/core';

@Component({
  selector: 'image-viewer',
  templateUrl: 'image-viewer.component.html',
  styleUrls: ['./image-viewer.component.scss']
})
export class ImageViewerComponent {

  @Input() images: string[];

  constructor() {}
}
