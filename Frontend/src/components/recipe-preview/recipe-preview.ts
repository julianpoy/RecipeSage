import { Component, Input, Output, EventEmitter } from '@angular/core';
import { UtilServiceProvider } from '../../providers/util-service/util-service';

@Component({
  selector: 'recipe-preview',
  templateUrl: 'recipe-preview.html'
})
export class RecipePreviewComponent {

  @Input() selected: boolean;
  @Input() landscape: boolean;
  @Input() url: string;
  @Input() description: string;

  @Output() click = new EventEmitter();

  constructor(
    public utilService: UtilServiceProvider
  ) {}

  onClick(event) {
    this.click.emit(event);
  }
}
