import { Component, ViewChild, effect, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  NavController,
  ModalController,
  PopoverController,
  AlertController,
} from "@ionic/angular/standalone";
import dayjs from "dayjs";
import { TranslateService } from "@ngx-translate/core";

import { LoadingService } from "~/services/loading.service";
import { WebsocketService } from "~/services/websocket.service";
import { RouteMap } from "~/services/util.service";
import { PreferencesService } from "~/services/preferences.service";
import {
  MealPlanPreferenceKey,
  MealPlanViewTypeOptions,
  getMealSortOrder,
  getMealColors,
  DEFAULT_MEAL_COLORS,
} from "@recipesage/util/shared";

import { MealCalendarComponent } from "~/components/meal-calendar/meal-calendar.component";
import { NullStateComponent } from "~/components/null-state/null-state.component";
import { NewMealPlanItemModalPage } from "../new-meal-plan-item-modal/new-meal-plan-item-modal.page";
import { MealPlanPopoverPage } from "~/pages/meal-plan-components/meal-plan-popover/meal-plan-popover.page";
import { MealPlanItemDetailsModalPage } from "~/pages/meal-plan-components/meal-plan-item-details-modal/meal-plan-item-details-modal.page";
import { MealPlanBulkPinModalPage } from "@recipesage/frontend/src/app/pages/meal-plan-components/meal-plan-bulk-pin-modal/meal-plan-bulk-pin-modal.page";
import { AddRecipeToShoppingListModalPage } from "~/pages/recipe-components/add-recipe-to-shopping-list-modal/add-recipe-to-shopping-list-modal.page";
import { ServerActionsService } from "../../../services/server-actions.service";
import type { MealPlanItemSummary } from "@recipesage/prisma";
import { Title } from "@angular/platform-browser";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonButton,
  IonIcon,
  IonContent,
  IonLabel,
  IonList,
  IonItemGroup,
  IonItemDivider,
  IonItem,
  IonFab,
  IonFabButton,
  IonSpinner,
} from "@ionic/angular/standalone";
import { add, calendar, chevronDown, chevronUp, options } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-meal-plan",
  templateUrl: "meal-plan.page.html",
  styleUrls: ["meal-plan.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    MealCalendarComponent,
    NullStateComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent,
    IonLabel,
    IonList,
    IonItemGroup,
    IonItemDivider,
    IonItem,
    IonFab,
    IonFabButton,
    IonSpinner,
  ],
})
export class MealPlanPage {
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private serverActionsService = inject(ServerActionsService);
  private websocketService = inject(WebsocketService);
  private preferencesService = inject(PreferencesService);
  private modalCtrl = inject(ModalController);
  private popoverCtrl = inject(PopoverController);
  private alertCtrl = inject(AlertController);
  private titleService = inject(Title);

  defaultBackHref: string = RouteMap.MealPlansPage.getPath();

  calendarMode: string = window.innerWidth > 600 ? "full" : "split";
  dayCopyInProgress = false;
  dayMoveInProgress = false;
  selectedDaysInProgress?: string[];

  private meQuery = this.serverActionsService.users.getMe();
  me = this.meQuery.value;
  mealPlanId: string = (() => {
    const id = this.route.snapshot.paramMap.get("mealPlanId");
    if (!id) {
      this.navCtrl.navigateBack(this.defaultBackHref);
      throw new Error("mealPlanId not provided");
    }
    return id;
  })();
  private mealPlanQuery = this.serverActionsService.mealPlans.getMealPlan({
    id: this.mealPlanId,
  });
  private mealPlanItemsQuery =
    this.serverActionsService.mealPlans.getMealPlanItems({
      mealPlanId: this.mealPlanId,
    });
  mealPlan = this.mealPlanQuery.value;
  mealPlanItems = this.mealPlanItemsQuery.value;

  mealsByDate: {
    [year: number]: {
      [month: number]: {
        [day: number]: {
          items: MealPlanItemSummary[];
        };
      };
    };
  } = {};

  mealColors: Record<string, string> = {};
  itemsByRecipeId: { [key: string]: MealPlanItemSummary } = {};
  recipeIds: string[] = [];

  preferences = this.preferencesService.preferences;
  preferenceKeys = MealPlanPreferenceKey;
  viewTypeOptions = MealPlanViewTypeOptions;

  selectedDays: string[] = [];
  selectedDaysSet = new Set<string>();
  pastMealsExpanded = false;
  upcomingDates: string[] = [];
  pastDates: string[] = [];
  listItemsByDate = new Map<string, MealPlanItemSummary[]>();
  listFormattedDates = new Map<string, string>();

  reference = "0";

  @ViewChild(MealCalendarComponent, { static: true })
  mealPlanCalendar?: MealCalendarComponent;

  constructor() {
    addIcons({ add, calendar, chevronDown, chevronUp, options });
    effect(() => {
      const mealPlan = this.mealPlan();
      const mealPlanItems = this.mealPlanItems();
      if (!mealPlan || !mealPlanItems) return;
      this.mealColors = getMealColors(mealPlan.customMealOptions);
      if (
        this.preferences[MealPlanPreferenceKey.ViewType] ===
        MealPlanViewTypeOptions.List
      ) {
        this.processItemsForListView();
      }
      void this.translate
        .get("generic.labeledPageTitle", { title: mealPlan.title })
        .toPromise()
        .then((title) => this.titleService.setTitle(title));
    });
  }

  ionViewWillEnter() {
    this.loadWithProgress();

    this.websocketService.on("mealplan:updated", this.onWSEvent);
  }

  ionViewWillLeave() {
    this.websocketService.off("mealplan:updated", this.onWSEvent);
  }

  onWSEvent = (data: Record<string, string>) => {
    if (
      data.mealPlanId === this.mealPlanId &&
      data.reference !== this.reference
    ) {
      this.reference = data.reference;
      this.loadMealPlan();
    }
  };

  loadWithProgress() {
    this.loadMealPlan();
  }

  loadMealPlan() {
    this.mealPlanQuery.refresh();
    this.mealPlanItemsQuery.refresh();
  }

  async _addItem(item: {
    title: string;
    recipeId?: string;
    meal: string;
    notes?: string;
    scheduledDate: string;
  }) {
    const loading = this.loadingService.start();

    const response =
      await this.serverActionsService.mealPlans.createMealPlanItems({
        mealPlanId: this.mealPlanId,
        items: [
          {
            title: item.title,
            recipeId: item.recipeId || null,
            meal: item.meal,
            notes: item.notes,
            scheduledDate: item.scheduledDate,
          },
        ],
      });
    if (response) this.reference = response.reference;

    this.loadMealPlan();

    loading.dismiss();
  }

  async newMealPlanItem() {
    const modal = await this.modalCtrl.create({
      component: NewMealPlanItemModalPage,
      componentProps: {
        scheduledDate: this.selectedDays[0],
        customMealOptions: this.mealPlan()?.customMealOptions ?? null,
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
        mealPlan: this.mealPlan(),
        isOwner: this.me()?.id === this.mealPlan()?.user.id,
        calendarCenter: this.mealPlanCalendar?.center,
        viewType: this.preferences[MealPlanPreferenceKey.ViewType],
      },
      event,
    });

    await popover.present();

    const { data } = await popover.onDidDismiss();

    if (data?.reload) {
      this.loadWithProgress();
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
        customMealOptions: this.mealPlan()?.customMealOptions ?? null,
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
    const modal = await this.modalCtrl.create({
      component: NewMealPlanItemModalPage,
      componentProps: {
        isEditing: true,
        inputType: mealItem.recipe ? "recipe" : "manualEntry",
        title: mealItem.title,
        recipe: mealItem.recipe,
        scheduledDate: dateStamp,
        meal: mealItem.meal,
        notes: mealItem.notes,
        customMealOptions: this.mealPlan()?.customMealOptions ?? null,
      },
    });
    modal.present();

    const { data } = await modal.onDidDismiss();
    if (!data || !data.item) return;
    const item = data.item;

    const loading = this.loadingService.start();
    const response =
      await this.serverActionsService.mealPlans.updateMealPlanItems({
        mealPlanId: this.mealPlanId,
        items: [
          {
            id: mealItem.id,
            title: item.title,
            recipeId: item.recipeId,
            scheduledDate: item.scheduledDate,
            meal: item.meal,
            notes: item.notes,
          },
        ],
      });
    if (response) this.reference = response.reference;
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
        scale: "1",
      },
    });

    modal.present();
  }

  async dayClicked(date: Date) {
    const dateStamp = dayjs(date).format("YYYY-MM-DD");
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
          message:
            (this.selectedDaysInProgress?.length ?? 0) > 1
              ? messageMultiple
              : messageSingle,
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
          message:
            (this.selectedDaysInProgress?.length ?? 0) > 1
              ? messageMultiple
              : messageSingle,
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
          meal: item.meal,
          notes: item.notes,
        }));
      })
      .flat();

    const loading = this.loadingService.start();
    const response =
      await this.serverActionsService.mealPlans.updateMealPlanItems({
        mealPlanId: this.mealPlanId,
        items: updatedItems,
      });
    if (response) this.reference = response.reference;
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
          meal: item.meal,
          notes: item.notes,
        }));
      })
      .flat();

    const loading = this.loadingService.start();
    const response =
      await this.serverActionsService.mealPlans.createMealPlanItems({
        mealPlanId: this.mealPlanId,
        items: newItems,
      });
    if (response) this.reference = response.reference;
    loading.dismiss();
    this.loadWithProgress();
  }

  async _deleteSelected() {
    const itemIds = this.selectedDays
      .map((day) => this.getItemsOnDay(day).map((item) => item.id))
      .flat();

    const loading = this.loadingService.start();
    const response =
      await this.serverActionsService.mealPlans.deleteMealPlanItems({
        mealPlanId: this.mealPlanId,
        ids: itemIds,
      });
    if (response) this.reference = response.reference;
    loading.dismiss();
    this.loadWithProgress();
  }

  getMealBorderColor(meal: string): string {
    return (
      this.mealColors[meal.toLowerCase()] ||
      DEFAULT_MEAL_COLORS[meal.toLowerCase()] ||
      DEFAULT_MEAL_COLORS.other
    );
  }

  setMealsByDate(mealsByDate: typeof this.mealsByDate) {
    this.mealsByDate = mealsByDate;
  }

  setSelectedDays(selectedDays: string[]) {
    this.selectedDays = selectedDays;
    this.selectedDaysSet = new Set(selectedDays);
  }

  processItemsForListView() {
    const mealPlanItems = this.mealPlanItems();
    if (!mealPlanItems) return;

    const sortOrder = getMealSortOrder(this.mealPlan()?.customMealOptions);

    this.mealsByDate = {};

    [...mealPlanItems]
      .sort((a, b) => {
        const comp =
          (sortOrder.get(a.meal.toLowerCase()) ?? 999) -
          (sortOrder.get(b.meal.toLowerCase()) ?? 999);
        if (comp === 0) return a.title.localeCompare(b.title);
        return comp;
      })
      .forEach((item) => {
        const [year, month, day] = item.scheduledDate
          .split("-")
          .map((el) => parseInt(el, 10));
        this.mealsByDate[year] = this.mealsByDate[year] || {};
        this.mealsByDate[year][month] = this.mealsByDate[year][month] || {};
        this.mealsByDate[year][month][day] = this.mealsByDate[year][month][
          day
        ] || {
          items: [],
        };
        this.mealsByDate[year][month][day].items.push(item);
      });

    const today = dayjs().format("YYYY-MM-DD");
    const upcoming: string[] = [];
    const past: string[] = [];

    for (const year of Object.keys(this.mealsByDate).map(Number)) {
      for (const month of Object.keys(this.mealsByDate[year]).map(Number)) {
        for (const day of Object.keys(this.mealsByDate[year][month]).map(
          Number,
        )) {
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          if (dateStr >= today) {
            upcoming.push(dateStr);
          } else {
            past.push(dateStr);
          }
        }
      }
    }

    this.upcomingDates = upcoming.sort();
    this.pastDates = past.sort().reverse();

    this.listItemsByDate = new Map();
    this.listFormattedDates = new Map();
    for (const dateStr of [...this.upcomingDates, ...this.pastDates]) {
      const d = dayjs(dateStr);
      this.listItemsByDate.set(
        dateStr,
        this.mealsByDate[d.year()]?.[d.month() + 1]?.[d.date()]?.items || [],
      );
      this.listFormattedDates.set(dateStr, d.format("MMMM D, YYYY"));
    }

    this.selectedDays = [];
    this.selectedDaysSet = new Set();
  }

  toggleDaySelection(dateStr: string) {
    if (this.selectedDaysSet.has(dateStr)) {
      this.selectedDaysSet.delete(dateStr);
      this.selectedDays = this.selectedDays.filter((d) => d !== dateStr);
    } else {
      this.selectedDaysSet.add(dateStr);
      this.selectedDays = [...this.selectedDays, dateStr];
    }
  }
}
