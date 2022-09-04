import { Component, Input, Output, EventEmitter } from '@angular/core';

import { UtilService } from '@/services/util.service';

@Component({
  selector: 'shopping-list-item',
  templateUrl: 'shopping-list-item.component.html',
  styleUrls: ['./shopping-list-item.component.scss']
})
export class ShoppingListItemComponent {
  completed = false;
  @Input() title;
  @Input() recipeTitle;
  @Input() createdAt;
  @Input() ownerName;
  @Output() markComplete = new EventEmitter<null>();
  constructor(private utilService: UtilService) {}

  formatItemCreationDate(plainTextDate) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }
}
