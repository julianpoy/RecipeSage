import {
  Component,
  ElementRef,
  inject,
  Input,
  type OnInit,
  QueryList,
  ViewChildren,
} from "@angular/core";
import {
  type ItemReorderEventDetail,
  ModalController,
} from "@ionic/angular/standalone";
import {
  DEFAULT_MEALS,
  DEFAULT_MEAL_COLORS,
  capitalizeEachWord,
  parseCustomMealOptions,
} from "@recipesage/util/shared";

import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { ColorPickerComponent } from "../../../components/color-picker/color-picker.component";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonReorderGroup,
  IonItem,
  IonInput,
  IonReorder,
  IonFooter,
  IonLabel,
} from "@ionic/angular/standalone";
import {
  checkmarkOutline,
  closeOutline,
  closeCircleOutline,
} from "ionicons/icons";
import { addIcons } from "ionicons";

interface MealOptionEntry {
  name: string;
  color: string | null;
  isDefault: boolean;
}

@Component({
  standalone: true,
  selector: "page-meal-plan-meal-order-modal",
  templateUrl: "meal-plan-meal-order-modal.page.html",
  styleUrls: ["meal-plan-meal-order-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    ColorPickerComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonReorderGroup,
    IonItem,
    IonInput,
    IonReorder,
    IonFooter,
    IonLabel,
  ],
})
export class MealPlanMealOrderModalPage implements OnInit {
  constructor() {
    addIcons({ checkmarkOutline, closeOutline, closeCircleOutline });
  }

  private modalCtrl = inject(ModalController);

  @Input()
  customMealOptions: string | undefined;

  entries: MealOptionEntry[] = [{ name: "", color: null, isDefault: false }];
  openColorPickerIndex: number | null = null;

  @ViewChildren("colorPickerContainer")
  colorPickerContainers!: QueryList<ElementRef<HTMLElement>>;

  ngOnInit() {
    const parsed = parseCustomMealOptions(this.customMealOptions);
    if (parsed.length > 0) {
      this.entries = parsed.map((e) => ({
        name: e.name,
        color: e.color || DEFAULT_MEAL_COLORS[e.name.toLowerCase()] || null,
        isDefault: DEFAULT_MEALS.includes(e.name.toLowerCase()),
      }));
    } else {
      this.entries = DEFAULT_MEALS.map((meal) => ({
        name: capitalizeEachWord(meal),
        color: DEFAULT_MEAL_COLORS[meal],
        isDefault: true,
      }));
    }
    this.entries.push({ name: "", color: null, isDefault: false });
  }

  onEntryInput(index: number) {
    if (index === this.entries.length - 1 && this.entries[index].name.trim()) {
      this.entries.push({ name: "", color: null, isDefault: false });
    }
  }

  onReorder(event: CustomEvent<ItemReorderEventDetail>) {
    const lastIndex = this.entries.length - 1;
    const from = event.detail.from;
    const to = Math.min(event.detail.to, lastIndex - 1);

    if (from === lastIndex || from === to) {
      event.detail.complete(false);
      return;
    }

    const item = this.entries.splice(from, 1)[0];
    this.entries.splice(to, 0, item);

    if (this.openColorPickerIndex !== null) {
      if (this.openColorPickerIndex === from) {
        this.openColorPickerIndex = to;
      } else {
        if (
          from < this.openColorPickerIndex &&
          to >= this.openColorPickerIndex
        ) {
          this.openColorPickerIndex--;
        } else if (
          from > this.openColorPickerIndex &&
          to <= this.openColorPickerIndex
        ) {
          this.openColorPickerIndex++;
        }
      }
    }

    event.detail.complete(false);
  }

  removeEntry(index: number) {
    this.entries.splice(index, 1);
    if (this.openColorPickerIndex === index) {
      this.openColorPickerIndex = null;
    } else if (
      this.openColorPickerIndex !== null &&
      this.openColorPickerIndex > index
    ) {
      this.openColorPickerIndex--;
    }
  }

  toggleColorPicker(index: number) {
    if (this.openColorPickerIndex === index) {
      this.openColorPickerIndex = null;
    } else {
      this.openColorPickerIndex = index;
      setTimeout(() => {
        this.colorPickerContainers.first?.nativeElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    }
  }

  onColorChange(index: number, color: string | null) {
    this.entries[index].color = color;
    if (index === this.entries.length - 1 && color) {
      this.entries.push({ name: "", color: null, isDefault: false });
    }
  }

  closeColorPicker() {
    this.openColorPickerIndex = null;
  }

  save() {
    const lines = this.entries
      .filter((e) => e.name.trim())
      .map((e) => {
        const name = e.name.trim();
        if (e.color) return `${e.color} ${name}`;
        return name;
      });

    this.modalCtrl.dismiss({
      customMealOptions: lines.length > 0 ? lines.join("\n") : null,
    });
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
