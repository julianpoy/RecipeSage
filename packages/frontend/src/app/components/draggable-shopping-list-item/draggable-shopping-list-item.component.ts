import { Component, Input, inject, Output, EventEmitter } from "@angular/core";

import { UtilService } from "~/services/util.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  selector: "draggable-shopping-list-item",
  templateUrl: "draggable-shopping-list-item.component.html",
  styleUrls: ["./draggable-shopping-list-item.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class DraggableShoppingListItemComponent {
  utilService = inject(UtilService);

  @Input({
    required: true,
  })
  title!: string;
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

  formatItemCreationDate(plainTextDate: string) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }
}
