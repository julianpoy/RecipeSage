import { Input, Component } from "@angular/core";
import {
  NavController,
  ModalController,
  ToastController,
} from "@ionic/angular";
import { Recipe, RecipeService } from "~/services/recipe.service";
import { LoadingService } from "~/services/loading.service";
import { UtilService } from "~/services/util.service";

@Component({
  selector: "page-new-meal-plan-item-modal",
  templateUrl: "new-meal-plan-item-modal.page.html",
  styleUrls: ["new-meal-plan-item-modal.page.scss"],
})
export class NewMealPlanItemModalPage {
  @Input() isEditing = false;
  @Input() inputType = "recipe";
  @Input() recipe?: Recipe;
  @Input() title: string = "";
  @Input() meal?: string;
  @Input() scheduled = new Date();

  sanitizedScheduled: string = "";

  constructor(
    public navCtrl: NavController,
    public modalCtrl: ModalController,
    public recipeService: RecipeService,
    public loadingService: LoadingService,
    public utilService: UtilService,
    public toastCtrl: ToastController,
  ) {
    setTimeout(() => {
      this.setSanitizedScheduled();
    });
  }

  setSanitizedScheduled() {
    const scheduled = new Date(this.scheduled);
    const year = scheduled.getFullYear();
    const month = (scheduled.getMonth() + 1).toString().padStart(2, "0");
    const date = scheduled.getDate().toString().padStart(2, "0");

    this.sanitizedScheduled = `${year}-${month}-${date}`;
  }

  scheduledDateChange(event: any) {
    const [year, month, date] = event.target.value.split("-");
    const scheduled = new Date();
    scheduled.setDate(date);
    scheduled.setMonth(month - 1);
    scheduled.setFullYear(year);
    this.scheduled = scheduled;
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
    if (!this.meal || !this.scheduled) return;

    const item = {
      title:
        this.inputType === "recipe" && this.recipe
          ? this.recipe.title
          : this.title,
      recipeId:
        this.inputType === "recipe" && this.recipe ? this.recipe.id : undefined,
      meal: this.meal,
      scheduled: this.scheduled,
    };

    this.modalCtrl.dismiss({
      item,
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
