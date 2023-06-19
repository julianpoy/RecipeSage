import { Component, Input, Output, EventEmitter } from "@angular/core";

@Component({
  selector: "shopping-list-group",
  templateUrl: "shopping-list-group.component.html",
  styleUrls: ["./shopping-list-group.component.scss"],
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

  constructor() {}
}
