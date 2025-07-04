import { Component, Input, Output, EventEmitter, inject } from "@angular/core";

import { UtilService } from "~/services/util.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  selector: "shopping-list-item",
  templateUrl: "shopping-list-item.component.html",
  styleUrls: ["./shopping-list-item.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class ShoppingListItemComponent {
  private utilService = inject(UtilService);

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
  recipeTitle!: string;
  @Input({
    required: true,
  })
  createdAt!: string;
  @Input({
    required: true,
  })
  ownerName!: string;
  @Output() completeToggle = new EventEmitter<null>();

  onComplete() {
    this.completeToggle.emit();
  }

  formatItemCreationDate(plainTextDate: string) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }
}
