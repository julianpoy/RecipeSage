import { Component, Input } from "@angular/core";
import { ToastController, ModalController } from "@ionic/angular";

import { LoadingService } from "~/services/loading.service";

import { NewMealPlanModalPage } from "~/pages/meal-plan-components/new-meal-plan-modal/new-meal-plan-modal.page";
import { TranslateService } from "@ngx-translate/core";
import { TRPCService } from "../../../services/trpc.service";
import type { MealPlanItemSummary, MealPlanSummary } from "@recipesage/prisma";

@Component({
  selector: "page-add-recipe-to-meal-plan-modal",
  templateUrl: "add-recipe-to-meal-plan-modal.page.html",
  styleUrls: ["add-recipe-to-meal-plan-modal.page.scss"],
})
export class AddRecipeToMealPlanModalPage {
  @Input() recipe: any;

  mealPlans?: MealPlanSummary[];

  selectedMealPlan?: MealPlanSummary;
  selectedMealPlanItems?: MealPlanItemSummary[];
  meal?: string;

  @Input() reference?: string;

  selectedDays: string[] = [];

  constructor(
    private translate: TranslateService,
    private trpcService: TRPCService,
    private loadingService: LoadingService,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
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
    if (matchingPlans.length > 0) {
      this.selectedMealPlan = matchingPlans[0];
      this.loadMealPlan(this.selectedMealPlan.id);
    } else if (this.mealPlans.length === 1) {
      this.selectedMealPlan = this.mealPlans[0];
      this.loadMealPlan(this.selectedMealPlan.id);
    }
  }

  saveLastUsedMealPlan() {
    if (!this.selectedMealPlan) return;

    localStorage.setItem("lastUsedMealPlanId", this.selectedMealPlan.id);
  }

  async loadMealPlans() {
    const mealPlans = await this.trpcService.handle(
      this.trpcService.trpc.mealPlans.getMealPlans.query(),
    );
    if (!mealPlans) return;

    this.mealPlans = mealPlans;

    this.selectLastUsedMealPlan();
  }

  async loadMealPlan(id: string) {
    const mealPlanItems = await this.trpcService.handle(
      this.trpcService.trpc.mealPlans.getMealPlanItems.query({
        mealPlanId: id,
      }),
    );

    if (!mealPlanItems) return;

    this.selectedMealPlanItems = mealPlanItems;
  }

  isFormValid() {
    if (!this.selectedMealPlan || !this.selectedDays[0]) return false;

    return this.meal && this.meal.length > 0;
  }

  async save() {
    if (!this.selectedMealPlan || !this.selectedDays[0] || !this.meal) return;

    const loading = this.loadingService.start();

    this.saveLastUsedMealPlan();

    const result = await this.trpcService.handle(
      this.trpcService.trpc.mealPlans.createMealPlanItem.mutate({
        mealPlanId: this.selectedMealPlan.id,
        title: this.recipe.title,
        recipeId: this.recipe.id,
        meal: this.meal as any, // TODO: Refine this type so that it aligns with Zod
        scheduledDate: this.selectedDays[0],
      }),
    );
    loading.dismiss();

    if (result) this.modalCtrl.dismiss();
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
