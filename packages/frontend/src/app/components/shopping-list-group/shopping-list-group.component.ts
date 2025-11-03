import { Component, Input, Output, EventEmitter } from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { ShoppingListItemComponent } from "../shopping-list-item/shopping-list-item.component";

@Component({
  selector: "shopping-list-group",
  templateUrl: "shopping-list-group.component.html",
  styleUrls: ["./shopping-list-group.component.scss"],
  imports: [...SHARED_UI_IMPORTS, ShoppingListItemComponent],
})
export class ShoppingListGroupComponent {
  completed = false;
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
  @Output() completeToggle = new EventEmitter<any>();
  @Output() recategorize = new EventEmitter<[any[], string]>();

  constructor() {}
}
