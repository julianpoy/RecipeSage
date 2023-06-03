import { Component, Input, Output, EventEmitter } from "@angular/core";

@Component({
  selector: "shopping-list-group",
  templateUrl: "shopping-list-group.component.html",
  styleUrls: ["./shopping-list-group.component.scss"],
})
export class ShoppingListGroupComponent {
  completed = false;
  @Input() categoryTitle: string;
  @Input() group: { title: string; items: any[] };
  @Input() groupTitleExpanded;
  @Input() showRecipeTitle: boolean;
  @Input() showAddedOn: boolean;
  @Input() showAddedBy: boolean;
  @Output() completeToggle = new EventEmitter<any>();

  constructor() {
    if (!this.categoryTitle) this.categoryTitle = "";
  }
}
