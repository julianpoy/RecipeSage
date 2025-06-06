import { Component, Input, Output, EventEmitter } from "@angular/core";

import { UtilService } from "~/services/util.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  selector: "draggable-shopping-list-item",
  templateUrl: "draggable-shopping-list-item.component.html",
  styleUrls: ["./draggable-shopping-list-item.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class DraggableShoppingListItemComponent {
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

  constructor(private utilService: UtilService) {}

  formatItemCreationDate(plainTextDate: string) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }
}
