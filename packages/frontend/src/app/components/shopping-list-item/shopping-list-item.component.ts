import { Component, Input, Output, EventEmitter } from "@angular/core";

import { UtilService } from "~/services/util.service";

@Component({
  selector: "shopping-list-item",
  templateUrl: "shopping-list-item.component.html",
  styleUrls: ["./shopping-list-item.component.scss"],
})
export class ShoppingListItemComponent {
  @Input({
    required: true,
  })
  title!: string;
  @Input({
    required: true,
  })
  completed!: boolean;
  @Input({
    required: true,
  })
  recipeTitle!: string | null;
  @Input({
    required: true,
  })
  createdAt!: Date | string | null;
  @Input({
    required: true,
  })
  ownerName!: string | null;
  @Output() completeToggle = new EventEmitter<null>();

  constructor(private utilService: UtilService) {}

  onComplete() {
    this.completeToggle.emit();
  }

  formatItemCreationDate(date: Date | string) {
    return this.utilService.formatDate(date, { now: true });
  }
}
