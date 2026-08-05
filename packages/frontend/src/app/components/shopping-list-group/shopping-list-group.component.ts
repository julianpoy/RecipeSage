import { Component, Input, Output, EventEmitter } from "@angular/core";
import type { ShoppingListItemSummary } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { ShoppingListItemComponent } from "../shopping-list-item/shopping-list-item.component";
import {
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonCheckbox,
  IonButton,
  IonIcon,
} from "@ionic/angular/standalone";
import { caretDown, caretUp } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "shopping-list-group",
  templateUrl: "shopping-list-group.component.html",
  styleUrls: ["./shopping-list-group.component.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    ShoppingListItemComponent,
    IonGrid,
    IonRow,
    IonCol,
    IonItem,
    IonCheckbox,
    IonButton,
    IonIcon,
  ],
})
export class ShoppingListGroupComponent {
  completed = false;
  @Input() categoryTitle: string = "";
  @Input({
    required: true,
  })
  group!: { title: string; items: ShoppingListItemSummary[] };
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
  @Output() completeToggle = new EventEmitter<ShoppingListItemSummary[]>();
  @Output() recategorize = new EventEmitter<
    [ShoppingListItemSummary[], string]
  >();

  constructor() {
    addIcons({ caretDown, caretUp });
  }
}
