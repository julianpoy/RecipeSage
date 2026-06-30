import { Input, Component, inject } from "@angular/core";
import dayjs from "dayjs";
import { ModalController } from "@ionic/angular/standalone";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectMealComponent } from "../../../components/select-meal/select-meal.component";
import { SelectRecipeComponent } from "../../../components/select-recipe/select-recipe.component";
import { RecurrenceEditorComponent } from "../../../components/recurrence-editor/recurrence-editor.component";
import type { RecipeSummary } from "@recipesage/prisma";
import {
  MEAL_PLAN_ITEMS_NOTES_LENGTH_LIMIT,
  MEAL_PLAN_ITEMS_TITLE_LENGTH_LIMIT,
} from "@recipesage/util/shared";
import type { RecurrenceRule } from "../../../components/recurrence-editor/util/recurrenceRule";
import { expandRecurrence } from "../../../components/recurrence-editor/util/expandRecurrence";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonItem,
  IonInput,
  IonLabel,
  IonTextarea,
  IonFooter,
} from "@ionic/angular/standalone";
import { calendarOutline, closeOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

export interface MealPlanItemDraft {
  title: string;
  recipeId: string | null;
  meal: string;
  notes: string;
  scheduledDate: string;
}

@Component({
  standalone: true,
  selector: "page-new-meal-plan-item-modal",
  templateUrl: "new-meal-plan-item-modal.page.html",
  styleUrls: ["new-meal-plan-item-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    SelectMealComponent,
    SelectRecipeComponent,
    RecurrenceEditorComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonItem,
    IonInput,
    IonLabel,
    IonTextarea,
    IonFooter,
  ],
})
export class NewMealPlanItemModalPage {
  constructor() {
    addIcons({ calendarOutline, closeOutline });
  }

  private modalCtrl = inject(ModalController);

  @Input() isEditing = false;
  @Input() inputType = "recipe";
  @Input() recipe?: RecipeSummary;
  @Input() title: string = "";
  @Input() meal?: string;
  @Input() notes: string = "";
  @Input() customMealOptions: string | null = null;
  @Input() scheduledDate = dayjs().format("YYYY-MM-DD");

  recurrence: RecurrenceRule | null = null;

  readonly titleMaxLength = MEAL_PLAN_ITEMS_TITLE_LENGTH_LIMIT;
  readonly notesMaxLength = MEAL_PLAN_ITEMS_NOTES_LENGTH_LIMIT;

  scheduledDateChange(event: any) {
    this.scheduledDate = dayjs(event.target.value).format("YYYY-MM-DD");
  }

  recurrenceChange(rule: RecurrenceRule | null) {
    this.recurrence = rule;
  }

  isFormValid() {
    if (this.inputType === "recipe" && !this.recipe) return false;

    if (
      this.inputType === "manualEntry" &&
      (!this.title || this.title.length === 0)
    )
      return false;

    if (!this.meal) return false;

    return true;
  }

  save() {
    if (!this.meal || !this.scheduledDate) return;

    const baseItem: MealPlanItemDraft = {
      title:
        this.inputType === "recipe" && this.recipe
          ? this.recipe.title
          : this.title,
      recipeId:
        this.inputType === "recipe" && this.recipe ? this.recipe.id : null,
      meal: this.meal,
      notes: this.notes,
      scheduledDate: this.scheduledDate,
    };

    const recurrence = this.isEditing ? null : this.recurrence;
    const items: MealPlanItemDraft[] = recurrence
      ? expandRecurrence(this.scheduledDate, recurrence).dates.map(
          (scheduledDate) => ({ ...baseItem, scheduledDate }),
        )
      : [baseItem];

    this.modalCtrl.dismiss({ items });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
