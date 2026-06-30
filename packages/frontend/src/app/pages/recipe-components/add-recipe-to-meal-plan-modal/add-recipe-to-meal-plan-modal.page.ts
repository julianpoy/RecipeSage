import {
  Component,
  EffectRef,
  Injector,
  Input,
  effect,
  inject,
  signal,
} from "@angular/core";
import { ToastController, ModalController } from "@ionic/angular/standalone";

import { LoadingService } from "../../../services/loading.service";

import { NewMealPlanModalPage } from "../../meal-plan-components/new-meal-plan-modal/new-meal-plan-modal.page";
import { TranslateService } from "@ngx-translate/core";
import { ServerActionsService } from "../../../services/server-actions.service";
import { RefreshableSignal } from "../../../services/server-actions/actions-base";
import type { MealPlanItemSummary, MealPlanSummary } from "@recipesage/prisma";
import { MEAL_PLAN_ITEMS_NOTES_LENGTH_LIMIT } from "@recipesage/util/shared";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { MealCalendarComponent } from "../../../components/meal-calendar/meal-calendar.component";
import { SelectMealComponent } from "../../../components/select-meal/select-meal.component";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonTextarea,
  IonFooter,
} from "@ionic/angular/standalone";
import { calendarOutline, closeOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-add-recipe-to-meal-plan-modal",
  templateUrl: "add-recipe-to-meal-plan-modal.page.html",
  styleUrls: ["add-recipe-to-meal-plan-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    MealCalendarComponent,
    SelectMealComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonLabel,
    IonTextarea,
    IonFooter,
  ],
})
export class AddRecipeToMealPlanModalPage {
  private translate = inject(TranslateService);
  private serverActionsService = inject(ServerActionsService);
  private loadingService = inject(LoadingService);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);
  private injector = inject(Injector);

  @Input() recipe: any;

  private mealPlansQuery = this.serverActionsService.mealPlans.getMealPlans();
  private mealPlanItemsQuerySig = signal<
    RefreshableSignal<MealPlanItemSummary[]> | undefined
  >(undefined);
  mealPlans?: MealPlanSummary[];

  selectedMealPlan?: MealPlanSummary;
  selectedMealPlanItems?: MealPlanItemSummary[];
  meal?: string;
  notes = "";

  readonly notesMaxLength = MEAL_PLAN_ITEMS_NOTES_LENGTH_LIMIT;

  @Input() reference?: string;

  selectedDays: string[] = [];

  constructor() {
    addIcons({ calendarOutline, closeOutline });
    effect(() => {
      const mealPlans = this.mealPlansQuery.value();
      if (!mealPlans) return;
      this.mealPlans = [...mealPlans].sort((a, b) =>
        a.title.localeCompare(b.title),
      );
      const selected = this.selectedMealPlan;
      if (selected && !this.mealPlans.some((mp) => mp.id === selected.id)) {
        this.selectedMealPlan = undefined;
        this.selectedMealPlanItems = undefined;
      }
      if (!this.selectedMealPlan) this.selectLastUsedMealPlan();
    });
    effect(() => {
      const items = this.mealPlanItemsQuerySig()?.value();
      if (!items) return;
      this.selectedMealPlanItems = items;
    });
  }

  ionViewWillEnter() {
    this.mealPlansQuery.refresh();
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

  loadMealPlan(id: string) {
    this.selectedMealPlanItems = undefined;
    this.mealPlanItemsQuerySig.set(
      this.serverActionsService.mealPlans.getMealPlanItems({
        mealPlanId: id,
      }),
    );
  }

  isFormValid() {
    if (!this.selectedMealPlan || !this.selectedDays[0]) return false;

    return this.meal && this.meal.length > 0;
  }

  async save() {
    if (!this.selectedMealPlan || !this.selectedDays[0] || !this.meal) return;

    const loading = this.loadingService.start();

    this.saveLastUsedMealPlan();

    const result =
      await this.serverActionsService.mealPlans.createMealPlanItems({
        mealPlanId: this.selectedMealPlan.id,
        items: [
          {
            title: this.recipe.title,
            recipeId: this.recipe.id,
            meal: this.meal as any, // TODO: Refine this type so that it aligns with Zod
            notes: this.notes,
            scheduledDate: this.selectedDays[0],
          },
        ],
      });
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
      if (!data || !data.success || typeof data.id !== "string") return;
      const newId = data.id;

      this.mealPlansQuery.refresh();

      let ref: EffectRef;
      ref = effect(
        () => {
          const mealPlans = this.mealPlansQuery.value();
          if (!mealPlans) return;
          const newMealPlan = mealPlans.find((mp) => mp.id === newId);
          if (!newMealPlan) return;
          ref.destroy();
          if (mealPlans.length === 1) {
            this.selectedMealPlan = newMealPlan;
            this.loadMealPlan(newMealPlan.id);
          } else {
            void this.toastCtrl
              .create({
                message,
                duration: 6000,
              })
              .then((toast) => toast.present());
          }
        },
        { injector: this.injector },
      );
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
