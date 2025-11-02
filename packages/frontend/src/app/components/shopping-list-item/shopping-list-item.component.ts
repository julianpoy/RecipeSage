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
  recipeTitle!: string | undefined;
  @Input({
    required: true,
  })
  createdAt!: Date | undefined;
  @Input({
    required: true,
  })
  ownerName!: string | undefined;
  @Output() completeToggle = new EventEmitter<null>();

  onComplete() {
    this.completeToggle.emit();
  }

  formatItemCreationDate(date: string | Date) {
    return this.utilService.formatDate(date, { now: true });
  }
}
