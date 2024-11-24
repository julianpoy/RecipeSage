import { Component, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  NavController,
  ToastController,
  ModalController,
  PopoverController,
  AlertController,
} from "@ionic/angular";
import dayjs from "dayjs";
import { TranslateService } from "@ngx-translate/core";

import { LoadingService } from "~/services/loading.service";
import { WebsocketService } from "~/services/websocket.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { ShoppingListService } from "~/services/shopping-list.service";
import { PreferencesService } from "~/services/preferences.service";
import { MealPlanPreferenceKey } from "@recipesage/util/shared";

import { MealCalendarComponent } from "~/components/meal-calendar/meal-calendar.component";
import { NewMealPlanItemModalPage } from "../new-meal-plan-item-modal/new-meal-plan-item-modal.page";
import { MealPlanPopoverPage } from "~/pages/meal-plan-components/meal-plan-popover/meal-plan-popover.page";
import { MealPlanItemDetailsModalPage } from "~/pages/meal-plan-components/meal-plan-item-details-modal/meal-plan-item-details-modal.page";
import { MealPlanBulkPinModalPage } from "~/pages/meal-plan-components/meal-plan-bulk-pin-modal";
import { AddRecipeToShoppingListModalPage } from "~/pages/recipe-components/add-recipe-to-shopping-list-modal/add-recipe-to-shopping-list-modal.page";
import { TRPCService } from "../../../services/trpc.service";
import type { MealPlanItemSummary, MealPlanSummary } from "@recipesage/prisma";
import { Title } from "@angular/platform-browser";

@Component({
  selector: "page-meal-plan",
  templateUrl: "meal-plan.page.html",
  styleUrls: ["meal-plan.page.scss"],
})
export class MealPlanPage {
  defaultBackHref: string = RouteMap.MealPlansPage.getPath();

  calendarMode: string = window.innerWidth > 600 ? "full" : "split";
  dayCopyInProgress = false;
  dayMoveInProgress = false;
  selectedDaysInProgress?: string[];

  mealPlanId: string; // From nav params
  mealPlan?: MealPlanSummary;
  mealPlanItems?: MealPlanItemSummary[];

  mealsByDate: {
    [year: number]: {
      [month: number]: {
        [day: number]: {
          items: MealPlanItemSummary[];
        };
      };
    };
  } = {};

  itemsByRecipeId: { [key: string]: MealPlanItemSummary } = {};
  recipeIds: string[] = [];

  preferences = this.preferencesService.preferences;
  preferenceKeys = MealPlanPreferenceKey;

  selectedDays: string[] = [];

  @ViewChild(MealCalendarComponent, { static: true })
  mealPlanCalendar?: MealCalendarComponent;

  constructor(
    public route: ActivatedRoute,
    public translate: TranslateService,
    public navCtrl: NavController,
    public loadingService: LoadingService,
    public trpcService: TRPCService,
    public shoppingListService: ShoppingListService,
    public websocketService: WebsocketService,
    public utilService: UtilService,
    public preferencesService: PreferencesService,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    private titleService: Title,
  ) {
    const mealPlanId = this.route.snapshot.paramMap.get("mealPlanId");
    if (!mealPlanId) {
      this.navCtrl.navigateBack(this.defaultBackHref);
      throw new Error("mealPlanId not provided");
    }
    this.mealPlanId = mealPlanId;

    this.websocketService.register(
      "mealPlan:itemsUpdated",
      (payload) => {
        if (payload.mealPlanId === this.mealPlanId) {
          this.loadMealPlan();
        }
      },
      this,
    );
  }

  ionViewWillEnter() {
    this.loadWithProgress();
  }

  refresh(loader: any) {
    this.loadMealPlan().then(
      () => {
        loader.target.complete();
      },
      () => {
        loader.target.complete();
      },
    );
  }

  async loadWithProgress() {
    const loading = this.loadingService.start();
    await this.loadMealPlan().finally(() => {
      loading.dismiss();
    });
  }

  async loadMealPlan() {
    const mealPlan = await this.trpcService.handle(
      this.trpcService.trpc.mealPlans.getMealPlan.query({
        id: this.mealPlanId,
      }),
    );
    if (!mealPlan) return;
    this.mealPlan = mealPlan;

    const title = await this.translate
      .get("generic.labeledPageTitle", {
        title: this.mealPlan.title,
      })
      .toPromise();
    this.titleService.setTitle(title);

    const mealPlanItems = await this.trpcService.handle(
      this.trpcService.trpc.mealPlans.getMealPlanItems.query({
        mealPlanId: this.mealPlanId,
      }),
    );
    if (!mealPlanItems) return;
    this.mealPlanItems = mealPlanItems;
  }

  async _addItem(item: {
    title: string;
    recipeId?: string;
    meal: string;
    scheduledDate: string;
  }) {
    const loading = this.loadingService.start();

    await this.trpcService.handle(
      this.trpcService.trpc.mealPlans.createMealPlanItem.mutate({
        mealPlanId: this.mealPlanId,
        title: item.title,
        recipeId: item.recipeId || null,
        meal: item.meal as any, // TODO: Refine this type so that it aligns with Zod
        scheduledDate: item.scheduledDate,
      }),
    );

    await this.loadMealPlan();

    loading.dismiss();
  }

  async newMealPlanItem() {
    const modal = await this.modalCtrl.create({
      component: NewMealPlanItemModalPage,
      componentProps: {
        scheduledDate: this.selectedDays[0],
      },
    });
    modal.present();
    modal.onDidDismiss().then(({ data }) => {
      if (!data || !data.item) return;
      this._addItem(data.item);
    });
  }

  async presentPopover(event: Event) {
    const popover = await this.popoverCtrl.create({
      component: MealPlanPopoverPage,
      componentProps: {
        mealPlanId: this.mealPlanId,
        mealPlan: this.mealPlan,
      },
      event,
    });

    await popover.present();

    const { data } = await popover.onDidDismiss();

    if (data?.reload) {
      await this.loadWithProgress();
      this.mealPlanCalendar?.generateCalendar();
    }
    if (data?.copy) this.startBulkCopy();
    if (data?.move) this.startBulkMove();
    if (data?.delete) this.bulkDelete();
    if (data?.pinRecipes) this.bulkPinRecipes();
    if (data?.bulkAddToShoppingList) this.bulkAddToShoppingList();
  }

  async itemClicked(mealItem: MealPlanItemSummary) {
    const modal = await this.modalCtrl.create({
      component: MealPlanItemDetailsModalPage,
      componentProps: {
        mealItem,
        mealPlanId: this.mealPlanId,
      },
    });
    modal.present();

    const { data } = await modal.onDidDismiss();
    if (data?.refresh) this.loadWithProgress();
  }

  async itemMoved({
    dateStamp,
    mealItem,
  }: {
    dateStamp: string;
    mealItem: MealPlanItemSummary;
  }) {
    console.log(dateStamp, mealItem);
    const modal = await this.modalCtrl.create({
      component: NewMealPlanItemModalPage,
      componentProps: {
        isEditing: true,
        inputType: mealItem.recipe ? "recipe" : "manualEntry",
        title: mealItem.title,
        recipe: mealItem.recipe,
        scheduledDate: dateStamp,
        meal: mealItem.meal,
      },
    });
    modal.present();

    const { data } = await modal.onDidDismiss();
    if (!data || !data.item) return;
    const item = data.item;

    const loading = this.loadingService.start();
    await this.trpcService.handle(
      this.trpcService.trpc.mealPlans.updateMealPlanItem.mutate({
        id: mealItem.id,
        title: item.title,
        recipeId: item.recipeId,
        scheduledDate: item.scheduledDate,
        meal: item.meal,
      }),
    );
    loading.dismiss();
    this.loadWithProgress();
  }

  getItemsOnDay(dateStamp: string) {
    const day = dayjs(dateStamp);
    return (
      this.mealsByDate?.[day.year()]?.[day.month() + 1]?.[day.date()]?.items ||
      []
    );
  }

  getSelectedMealItemCount(): number {
    return this.selectedDays
      .map((dateStamp) => this.getItemsOnDay(dateStamp).length)
      .reduce((acc, el) => acc + el, 0);
  }

  async emptyDaysSelectedAlert() {
    const header = await this.translate
      .get("pages.mealPlan.modal.emptyDays.header")
      .toPromise();
    const message = await this.translate
      .get("pages.mealPlan.modal.emptyDays.message")
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const emptyAlert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: okay,
          role: "cancel",
        },
      ],
    });
    await emptyAlert.present();
  }

  async startBulkCopy() {
    this.dayCopyInProgress = false;

    if (this.getSelectedMealItemCount() === 0) {
      this.emptyDaysSelectedAlert();
      return;
    }

    const header = await this.translate
      .get("pages.mealPlan.modal.copy.header")
      .toPromise();
    const message = await this.translate
      .get("pages.mealPlan.modal.copy.message")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const copyAlert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
        },
        {
          text: okay,
          handler: () => {
            this.dayCopyInProgress = true;
            this.selectedDaysInProgress = Array.from(this.selectedDays);
          },
        },
      ],
    });
    copyAlert.present();
  }

  async startBulkMove() {
    this.dayMoveInProgress = false;

    if (this.getSelectedMealItemCount() === 0) {
      this.emptyDaysSelectedAlert();
      return;
    }

    const header = await this.translate
      .get("pages.mealPlan.modal.move.header")
      .toPromise();
    const message = await this.translate
      .get("pages.mealPlan.modal.move.message")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const moveAlert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
        },
        {
          text: okay,
          handler: () => {
            this.dayMoveInProgress = true;
            this.selectedDaysInProgress = Array.from(this.selectedDays);
          },
        },
      ],
    });
    moveAlert.present();
  }

  async bulkDelete() {
    if (this.getSelectedMealItemCount() === 0) {
      this.emptyDaysSelectedAlert();
      return;
    }

    const daysList = this.selectedDays
      .map((day) => dayjs(day).format("MMM D"))
      .join(", ");

    const header = await this.translate
      .get("pages.mealPlan.modal.delete.header")
      .toPromise();
    const message = await this.translate
      .get("pages.mealPlan.modal.delete.message", { daysList })
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const del = await this.translate.get("generic.delete").toPromise();

    const deleteAlert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
        },
        {
          text: del,
          cssClass: "alertDanger",
          handler: () => {
            this._deleteSelected();
          },
        },
      ],
    });
    deleteAlert.present();
  }

  async bulkPinRecipes() {
    if (this.getSelectedMealItemCount() === 0) {
      this.emptyDaysSelectedAlert();
      return;
    }

    const selectedItems = this.selectedDays
      .map((selectedDay) => this.getItemsOnDay(selectedDay))
      .flat();

    const modal = await this.modalCtrl.create({
      component: MealPlanBulkPinModalPage,
      componentProps: {
        mealItems: selectedItems,
      },
    });
    modal.present();
  }

  async bulkAddToShoppingList() {
    if (this.getSelectedMealItemCount() === 0) {
      this.emptyDaysSelectedAlert();
      return;
    }

    const selectedItems = this.selectedDays
      .map((selectedDay) => this.getItemsOnDay(selectedDay))
      .flat();
    const selectedRecipes = selectedItems
      .map((item) => item.recipe)
      .filter((e) => e);

    if (selectedRecipes.length === 0) {
      const header = await this.translate
        .get("pages.mealPlan.modal.noRecipes.header")
        .toPromise();
      const message = await this.translate
        .get("pages.mealPlan.modal.noRecipes.message")
        .toPromise();
      const okay = await this.translate.get("generic.okay").toPromise();

      const noRecipesAlert = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          {
            text: okay,
          },
        ],
      });
      await noRecipesAlert.present();
      return;
    }

    const modal = await this.modalCtrl.create({
      component: AddRecipeToShoppingListModalPage,
      componentProps: {
        recipes: selectedRecipes,
        scale: 1,
      },
    });

    modal.present();
  }

  async dayClicked(dateStamp: string) {
    if (this.dayMoveInProgress || this.dayCopyInProgress) {
      const selectedDayList = (this.selectedDaysInProgress || [])
        .map((selectedDay) => dayjs(selectedDay).format("MMM D"))
        .join(", ");
      const destDay = dayjs(dateStamp).format("MMM D");

      if (this.dayCopyInProgress) {
        const header = await this.translate
          .get("pages.mealPlan.modal.copyConfirm.header")
          .toPromise();
        const messageSingle = await this.translate
          .get("pages.mealPlan.modal.copyConfirm.messageSingle", {
            selectedDayList,
            destDay,
          })
          .toPromise();
        const messageMultiple = await this.translate
          .get("pages.mealPlan.modal.copyConfirm.messageMultiple", {
            selectedDayList,
            destDay,
          })
          .toPromise();
        const change = await this.translate
          .get("pages.mealPlan.modal.copyConfirm.change")
          .toPromise();
        const cancel = await this.translate.get("generic.cancel").toPromise();
        const okay = await this.translate.get("generic.okay").toPromise();

        const alert = await this.alertCtrl.create({
          header,
          message: selectedDayList.length > 1 ? messageMultiple : messageSingle,
          buttons: [
            {
              text: cancel,
              role: "cancel",
              handler: () => {
                this.dayCopyInProgress = false;
              },
            },
            {
              text: change,
            },
            {
              text: okay,
              handler: async () => {
                this.dayCopyInProgress = false;
                this._copySelectedTo(dateStamp);
              },
            },
          ],
        });
        alert.present();
      }

      if (this.dayMoveInProgress) {
        const header = await this.translate
          .get("pages.mealPlan.modal.moveConfirm.header")
          .toPromise();
        const messageSingle = await this.translate
          .get("pages.mealPlan.modal.moveConfirm.messageSingle", {
            selectedDayList,
            destDay,
          })
          .toPromise();
        const messageMultiple = await this.translate
          .get("pages.mealPlan.modal.moveConfirm.messageMultiple", {
            selectedDayList,
            destDay,
          })
          .toPromise();
        const change = await this.translate
          .get("pages.mealPlan.modal.moveConfirm.change")
          .toPromise();
        const cancel = await this.translate.get("generic.cancel").toPromise();
        const okay = await this.translate.get("generic.okay").toPromise();

        const alert = await this.alertCtrl.create({
          header,
          message: selectedDayList.length > 1 ? messageMultiple : messageSingle,
          buttons: [
            {
              text: cancel,
              role: "cancel",
              handler: () => {
                this.dayMoveInProgress = false;
              },
            },
            {
              text: change,
            },
            {
              text: okay,
              handler: async () => {
                this.dayMoveInProgress = false;
                this._moveSelectedTo(dateStamp);
              },
            },
          ],
        });
        alert.present();
      }
    }
  }

  async _moveSelectedTo(dateStamp: string) {
    if (!this.selectedDaysInProgress)
      throw new Error("Move initiated with no selected days");

    const dayDiff = dayjs(dateStamp).diff(
      this.selectedDaysInProgress[0],
      "day",
    );

    const updatedItems = this.selectedDaysInProgress
      .map((selectedDay) => {
        return this.getItemsOnDay(selectedDay).map((item) => ({
          id: item.id,
          title: item.title,
          recipeId: item.recipeId,
          scheduledDate: dayjs(item.scheduledDate)
            .add(dayDiff, "day")
            .format("YYYY-MM-DD"),
          meal: item.meal as any, // TODO: Refine this type so that it aligns with Zod
        }));
      })
      .flat();

    const loading = this.loadingService.start();
    await this.trpcService.handle(
      this.trpcService.trpc.mealPlans.updateMealPlanItems.mutate({
        mealPlanId: this.mealPlanId,
        items: updatedItems,
      }),
    );
    loading.dismiss();
    this.loadWithProgress();
  }

  async _copySelectedTo(dateStamp: string) {
    if (!this.selectedDaysInProgress)
      throw new Error("Move initiated with no selected days");

    const dayDiff = dayjs(dateStamp).diff(
      this.selectedDaysInProgress[0],
      "day",
    );

    const newItems = this.selectedDaysInProgress
      .map((selectedDay) => {
        return this.getItemsOnDay(selectedDay).map((item) => ({
          title: item.title,
          recipeId: item.recipeId,
          scheduledDate: dayjs(item.scheduledDate)
            .add(dayDiff, "day")
            .format("YYYY-MM-DD"),
          meal: item.meal as any, // TODO: Refine this type so that it aligns with Zod
        }));
      })
      .flat();

    const loading = this.loadingService.start();
    await this.trpcService.handle(
      this.trpcService.trpc.mealPlans.createMealPlanItems.mutate({
        mealPlanId: this.mealPlanId,
        items: newItems,
      }),
    );
    loading.dismiss();
    this.loadWithProgress();
  }

  async _deleteSelected() {
    const itemIds = this.selectedDays
      .map((day) => this.getItemsOnDay(day).map((item) => item.id))
      .flat();

    const loading = this.loadingService.start();
    await this.trpcService.handle(
      this.trpcService.trpc.mealPlans.deleteMealPlanItems.mutate({
        mealPlanId: this.mealPlanId,
        ids: itemIds,
      }),
    );
    loading.dismiss();
    this.loadWithProgress();
  }

  setMealsByDate(mealsByDate: typeof this.mealsByDate) {
    this.mealsByDate = mealsByDate;
  }

  setSelectedDays(selectedDays: string[]) {
    this.selectedDays = selectedDays;
  }
}
