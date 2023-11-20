import { Component, Input } from "@angular/core";
import {
  NavController,
  ToastController,
  ModalController,
  AlertController,
} from "@ionic/angular";

import { LoadingService } from "~/services/loading.service";
import { RecipeService } from "~/services/recipe.service";
import { UtilService } from "~/services/util.service";
import {
  MealPlan,
  MealPlans,
  MealPlanService,
} from "~/services/meal-plan.service";

import { NewMealPlanModalPage } from "~/pages/meal-plan-components/new-meal-plan-modal/new-meal-plan-modal.page";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: "page-add-recipe-to-meal-plan-modal",
  templateUrl: "add-recipe-to-meal-plan-modal.page.html",
  styleUrls: ["add-recipe-to-meal-plan-modal.page.scss"],
})
export class AddRecipeToMealPlanModalPage {
  @Input() recipe: any;

  mealPlans?: MealPlans;

  selectedMealPlan?: MealPlans[0];
  destinationMealPlan?: MealPlan;
  meal?: string;

  @Input() reference?: string;

  selectedDays: number[] = [];

  constructor(
    public navCtrl: NavController,
    public translate: TranslateService,
    public mealPlanService: MealPlanService,
    public recipeService: RecipeService,
    public loadingService: LoadingService,
    public utilService: UtilService,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public modalCtrl: ModalController,
  ) {}

  ionViewWillEnter() {
    const loading = this.loadingService.start();
    this.loadMealPlans().then(
      () => {
        loading.dismiss();
      },
      () => {
        loading.dismiss();
      },
    );
  }

  selectLastUsedMealPlan() {
    if (!this.mealPlans) return;

    const lastUsedMealPlanId = localStorage.getItem("lastUsedMealPlanId");
    const matchingPlans = this.mealPlans.filter(
      (mealPlan) => mealPlan.id === lastUsedMealPlanId,
    );
    if (matchingPlans.length > 0 || this.mealPlans.length === 1) {
      this.selectedMealPlan = this.mealPlans[0];
      this.loadMealPlan(this.selectedMealPlan.id);
    }
  }

  saveLastUsedMealPlan() {
    if (!this.selectedMealPlan) return;

    localStorage.setItem("lastUsedMealPlanId", this.selectedMealPlan.id);
  }

  async loadMealPlans() {
    const response = await this.mealPlanService.fetch();
    if (!response.success) return;

    this.mealPlans = response.data;

    this.selectLastUsedMealPlan();
  }

  async loadMealPlan(id: string) {
    const response = await this.mealPlanService.fetchById(id);
    if (!response.success) return;

    this.destinationMealPlan = response.data;
  }

  isFormValid() {
    if (!this.destinationMealPlan) return false;

    return this.meal && this.meal.length > 0;
  }

  async save() {
    if (!this.destinationMealPlan || !this.meal) return;

    const loading = this.loadingService.start();

    this.saveLastUsedMealPlan();

    const response = await this.mealPlanService.addItem(
      this.destinationMealPlan.id,
      {
        title: this.recipe.title,
        recipeId: this.recipe.id,
        meal: this.meal,
        scheduled: new Date(this.selectedDays[0]).toISOString(),
      },
    );
    loading.dismiss();

    if (response.success) this.modalCtrl.dismiss();
  }

  async createMealPlan() {
    const message = await this.translate
      .get("pages.addRecipeToMealPlanModal.newMealPlanSuccess")
      .toPromise();

    const modal = await this.modalCtrl.create({
      component: NewMealPlanModalPage,
    });
    modal.present();
    modal.onDidDismiss().then(({ data }) => {
      if (!data || !data.success) return;

      // Check for new meal plans
      this.loadMealPlans().then(async () => {
        if (this.mealPlans?.length === 1) {
          this.selectedMealPlan = this.mealPlans[0];
          this.loadMealPlan(this.mealPlans[0].id);
        } else {
          (
            await this.toastCtrl.create({
              message,
              duration: 6000,
            })
          ).present();
        }
      });
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
