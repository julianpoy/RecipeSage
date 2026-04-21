import { Input, Component, inject } from "@angular/core";
import dayjs from "dayjs";
import { ModalController } from "@ionic/angular/standalone";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectMealComponent } from "../../../components/select-meal/select-meal.component";
import { SelectRecipeComponent } from "../../../components/select-recipe/select-recipe.component";
import type { RecipeSummary } from "@recipesage/prisma";

@Component({
  standalone: true,
  selector: "page-new-meal-plan-item-modal",
  templateUrl: "new-meal-plan-item-modal.page.html",
  styleUrls: ["new-meal-plan-item-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS, SelectMealComponent, SelectRecipeComponent],
})
export class NewMealPlanItemModalPage {
  private modalCtrl = inject(ModalController);

  @Input() isEditing = false;
  @Input() inputType = "recipe";
  @Input() recipe?: RecipeSummary;
  @Input() title: string = "";
  @Input() meal?: string;
  @Input() notes: string = "";
  @Input() customMealOptions: string | null = null;
  @Input() scheduledDate = dayjs().format("YYYY-MM-DD");

  scheduledDateChange(event: any) {
    this.scheduledDate = dayjs(event.target.value).format("YYYY-MM-DD");
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

    const item = {
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

    this.modalCtrl.dismiss({
      item,
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
