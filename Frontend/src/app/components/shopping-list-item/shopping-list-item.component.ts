import { Component, Input, Output, EventEmitter } from '@angular/core';

import { UtilService } from '@/services/util.service';

@Component({
  selector: 'shopping-list-item',
  templateUrl: 'shopping-list-item.component.html',
  styleUrls: ['./shopping-list-item.component.scss']
})
export class ShoppingListItemComponent {
  @Input() title: string;
  @Input() completed: boolean;
  @Input() recipeTitle: string;
  @Input() createdAt: string;
  @Input() ownerName: string;
  @Output() onCompleteToggle = new EventEmitter<null>();
  constructor(private utilService: UtilService) {}

  onComplete() {
    this.onCompleteToggle.emit();
  }

  formatItemCreationDate(plainTextDate: string) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }
}
