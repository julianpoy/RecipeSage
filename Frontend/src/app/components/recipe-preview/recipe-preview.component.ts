import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'recipe-preview',
  templateUrl: 'recipe-preview.component.html',
  styleUrls: ['./recipe-preview.component.scss']
})
export class RecipePreviewComponent {

  @Input() selected: boolean;
  @Input() landscape: boolean;
  @Input() url: string;
  @Input() description: string;

  @Output() click = new EventEmitter();

  constructor(public sanitizer: DomSanitizer) {}

  onClick(event) {
    this.click.emit(event);
  }
}
