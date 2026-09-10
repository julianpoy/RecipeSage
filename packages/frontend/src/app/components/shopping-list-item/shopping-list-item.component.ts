import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  ViewChild,
} from "@angular/core";

import { UtilService } from "../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { TranslateService } from "@ngx-translate/core";
import {
  IonItem,
  IonCheckbox,
  IonButton,
  IonIcon,
  IonPopover,
  IonContent,
  IonList,
  IonListHeader,
  IonLabel,
} from "@ionic/angular/standalone";
import {
  SHOPPING_LIST_CATEGORY_I18N,
  SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT,
} from "@recipesage/util/shared";
import type { ShoppingListSummary } from "@recipesage/prisma";
import {
  arrowBackOutline,
  arrowForwardOutline,
  copyOutline,
  createOutline,
  ellipsisVerticalOutline,
  trashOutline,
} from "ionicons/icons";
import { addIcons } from "ionicons";
import { AlertModalComponent } from "../alert-modal/alert-modal.component";
import { TextInputComponent } from "../forms/text-input/text-input.component";

@Component({
  standalone: true,
  selector: "shopping-list-item",
  templateUrl: "shopping-list-item.component.html",
  styleUrls: ["./shopping-list-item.component.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    AlertModalComponent,
    TextInputComponent,
    IonItem,
    IonCheckbox,
    IonButton,
    IonIcon,
    IonPopover,
    IonContent,
    IonList,
    IonListHeader,
    IonLabel,
  ],
})
export class ShoppingListItemComponent {
  private utilService = inject(UtilService);
  private translate = inject(TranslateService);

  moveToPopoverIsOpen = false;
  popoverView: "menu" | "moveToList" | "copyToList" = "menu";
  isEditTitleModalOpen = false;
  editTitleInput = "";
  isCustomCategoryModalOpen = false;
  customCategoryInput = "";
  titleLengthLimit = SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT;

  @Input({
    required: true,
  })
  id!: string;
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
  @Input({
    required: false,
  })
  showDeleteButton?: boolean;
  @Input({
    required: false,
  })
  hideRecategorizeOptions?: boolean;
  @Input({
    required: false,
  })
  hideDeleteOption?: boolean;
  @Input({
    required: false,
  })
  otherShoppingLists?: ShoppingListSummary[];
  @Output() completeToggle = new EventEmitter<null>();
  @Output() recategorize = new EventEmitter<string>();
  @Output() titleUpdate = new EventEmitter<string>();
  @Output() deleteClick = new EventEmitter<null>();
  @Output() moveToList = new EventEmitter<string>();
  @Output() copyToList = new EventEmitter<string>();

  @ViewChild("moveToPopover") moveToPopover!: HTMLIonPopoverElement;

  builtinCategoryI18n = Object.values(SHOPPING_LIST_CATEGORY_I18N);
  builtinCategories: string[] = [];
  categories: string[] = [];

  constructor() {
    addIcons({
      arrowBackOutline,
      arrowForwardOutline,
      copyOutline,
      createOutline,
      ellipsisVerticalOutline,
      trashOutline,
    });
    this.refreshCategories();
    this.generateBuiltinCategories();
  }

  async generateBuiltinCategories() {
    this.builtinCategories = await Promise.all(
      this.builtinCategoryI18n.map((el) => this.translate.get(el).toPromise()),
    );

    this.refreshCategories();
  }

  refreshCategories() {
    const collator = new Intl.Collator(this.utilService.getCurrentLocale());

    this.categories = [
      ...this.builtinCategories,
      ...this.getUserKnownCategories(),
    ].sort(collator.compare);
  }

  onComplete() {
    this.completeToggle.emit();
  }

  formatItemCreationDate(date: string | Date) {
    return this.utilService.formatDate(date, { now: true });
  }

  moveToCategory(title: string) {
    this.recategorize.emit(title);
  }

  getUserKnownCategories(): string[] {
    const userKnownCategories = new Set<string>(
      JSON.parse(
        localStorage.getItem("shoppingListUserCustomCategories") || "[]",
      ),
    );

    for (const builtinCategory of this.builtinCategories) {
      userKnownCategories.delete(builtinCategory);
    }

    return Array.from(userKnownCategories);
  }

  addUserKnownCategory(category: string) {
    const existing = this.getUserKnownCategories();
    if (!existing.includes(category)) {
      existing.push(category);
      localStorage.setItem(
        "shoppingListUserCustomCategories",
        JSON.stringify(existing),
      );
    }
  }

  showMoveToPopover(event: Event) {
    this.moveToPopover.event = event;
    this.popoverView = "menu";
    this.moveToPopoverIsOpen = true;
  }

  dismissMoveToPopover() {
    this.moveToPopoverIsOpen = false;
  }

  onMoveToPopoverDismissed() {
    this.moveToPopoverIsOpen = false;
    this.popoverView = "menu";
  }

  selectDestinationList(shoppingListId: string) {
    const popoverView = this.popoverView;
    this.dismissMoveToPopover();

    if (popoverView === "moveToList") {
      this.moveToList.emit(shoppingListId);
    }
    if (popoverView === "copyToList") {
      this.copyToList.emit(shoppingListId);
    }
  }

  showEditTitleInput() {
    this.editTitleInput = this.title;
    this.isEditTitleModalOpen = true;
  }

  submitEditTitle() {
    const title = this.editTitleInput.trim();
    if (!title) return;

    this.isEditTitleModalOpen = false;
    if (title === this.title) return;

    this.titleUpdate.emit(title);
  }

  showMoveToArbitraryInput() {
    this.customCategoryInput = "";
    this.isCustomCategoryModalOpen = true;
  }

  submitCustomCategory() {
    const category = this.customCategoryInput.trim();
    if (!category) return;

    this.isCustomCategoryModalOpen = false;
    this.addUserKnownCategory(category);
    this.refreshCategories();
    this.moveToCategory(category);
  }
}
