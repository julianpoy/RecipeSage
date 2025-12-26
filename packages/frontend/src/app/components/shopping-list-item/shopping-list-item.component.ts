import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  ViewChild,
} from "@angular/core";

import { UtilService } from "~/services/util.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { TranslateService } from "@ngx-translate/core";
import { AlertController } from "@ionic/angular";

@Component({
  standalone: true,
  selector: "shopping-list-item",
  templateUrl: "shopping-list-item.component.html",
  styleUrls: ["./shopping-list-item.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class ShoppingListItemComponent {
  private utilService = inject(UtilService);
  private translate = inject(TranslateService);
  private alertCtrl = inject(AlertController);

  moveToPopoverIsOpen = false;

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
  hideRecategorizeButton?: boolean;
  @Output() completeToggle = new EventEmitter<null>();
  @Output() recategorize = new EventEmitter<string>();
  @Output() deleteClick = new EventEmitter<null>();

  @ViewChild("moveToPopover") moveToPopover!: HTMLIonPopoverElement;

  builtinCategoryI18n = [
    "pages.shoppingList.category.uncategorized",
    "pages.shoppingList.category.produce",
    "pages.shoppingList.category.dairy",
    "pages.shoppingList.category.meat",
    "pages.shoppingList.category.bakery",
    "pages.shoppingList.category.grocery",
    "pages.shoppingList.category.liquor",
    "pages.shoppingList.category.seafood",
    "pages.shoppingList.category.nonfood",
    "pages.shoppingList.category.frozen",
    "pages.shoppingList.category.canned",
    "pages.shoppingList.category.beverages",
  ];
  builtinCategories: string[] = [];
  userKnownCategories = this.getUserKnownCategories();

  constructor() {
    this.generateBuiltinCategories();
  }

  async generateBuiltinCategories() {
    this.builtinCategories = (
      await Promise.all(
        this.builtinCategoryI18n.map((el) =>
          this.translate.get(el).toPromise(),
        ),
      )
    ).sort((a: string, b: string) => a.localeCompare(b));

    this.userKnownCategories = this.getUserKnownCategories();
  }

  onComplete() {
    this.completeToggle.emit();
  }

  formatItemCreationDate(date: string | Date) {
    return this.utilService.formatDate(date, { now: true });
  }

  moveToCategoryI18n(i18n: string) {
    const categoryTitle = this.translate.instant(i18n);
    this.recategorize.emit(categoryTitle);
  }

  moveToCategoryCustom(title: string) {
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

    return Array.from(userKnownCategories).sort((a: string, b: string) =>
      a.localeCompare(b),
    );
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
    this.moveToPopoverIsOpen = true;
  }

  async showMoveToArbitraryInput() {
    const header = await this.translate
      .get("components.shoppingListItem.customCategory.title")
      .toPromise();
    const message = await this.translate
      .get("components.shoppingListItem.customCategory.message")
      .toPromise();
    const placeholder = await this.translate
      .get("components.shoppingListItem.customCategory.placeholder")
      .toPromise();
    const save = await this.translate.get("generic.save").toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      inputs: [
        {
          name: "category",
          placeholder,
        },
      ],
      buttons: [
        {
          text: cancel,
          role: "cancel",
        },
        {
          text: save,
          role: "confirm",
        },
      ],
    });

    await alert.present();
    const detail = await alert.onDidDismiss();
    if (detail.role === "confirm") {
      this.addUserKnownCategory(detail.data.values.category);
      this.moveToCategoryCustom(detail.data.values.category);
    }
  }
}
