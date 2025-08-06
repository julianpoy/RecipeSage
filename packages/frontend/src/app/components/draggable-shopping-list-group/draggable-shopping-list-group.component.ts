import { Component, Input, Output, EventEmitter } from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { DraggableShoppingListItemComponent } from "../draggable-shopping-list-item/draggable-shopping-list-item.component";

@Component({
  selector: "draggable-shopping-list-group",
  templateUrl: "draggable-shopping-list-group.component.html",
  styleUrls: ["./draggable-shopping-list-group.component.scss"],
  imports: [...SHARED_UI_IMPORTS, DraggableShoppingListItemComponent],
})
export class DraggableShoppingListGroupComponent {
  @Input() categoryTitle: string = "";
  @Input({
    required: true,
  })
  group!: { title: string; items: any[] };
  @Input({
    required: true,
  })
  groupTitleExpanded!: Record<string, boolean>;
  @Input({
    required: true,
  })
  showRecipeTitle!: boolean;
  @Input({
    required: true,
  })
  showAddedOn!: boolean;
  @Input({
    required: true,
  })
  showAddedBy!: boolean;

  constructor() {}
}
