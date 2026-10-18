import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import dayjs, { type Dayjs } from "dayjs";
import { PlusIcon } from "lucide-react";
import type { MealPlanItemSummary } from "@recipesage/prisma";
import {
  MealPlanPreferenceKey,
  MealPlanViewTypeOptions,
  WSBroadcastEventType,
  getMealColors,
  getMealSortOrder,
} from "@recipesage/util/shared";
import { Spinner } from "@/components/ui/spinner";
import { showAlert } from "../../../components/dialogs/showAlert";
import { showToast } from "../../../components/dialogs/showToast";
import { BackButton } from "../../../components/layout/BackButton";
import { Fab } from "../../../components/layout/Fab";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  MealCalendar,
  type MealCalendarItemMovedEvent,
  type MealCalendarMode,
  type MealsByDate,
} from "../../../components/meal-calendar/MealCalendar";
import { NullState } from "../../../components/NullState";
import { useOfflineFirstQuery } from "../../../hooks/useOfflineFirstQuery";
import { useWebsocketEvent } from "../../../hooks/useWebsocketEvent";
import { loadingService } from "../../../services/loadingService";
import { serverActions } from "../../../services/serverActions";
import { preferencesStore } from "../../../stores/preferencesStore";
import { formatMonthYear } from "../../../utils/formatDate";
import { openAddRecipeToShoppingListModal } from "../../recipe-components/add-recipe-to-shopping-list-modal/openAddRecipeToShoppingListModal";
import { openMealPlanBulkPinModal } from "../meal-plan-bulk-pin-modal/openMealPlanBulkPinModal";
import { openMealPlanItemDetailsModal } from "../meal-plan-item-details-modal/openMealPlanItemDetailsModal";
import { MealPlanPopover } from "../meal-plan-popover/MealPlanPopover";
import type { MealPlanItemDraft } from "../new-meal-plan-item-modal/NewMealPlanItemModal";
import { openNewMealPlanItemModal } from "../new-meal-plan-item-modal/openNewMealPlanItemModal";
import {
  MealPlanListView,
  type MealPlanListData,
  type MealPlanPastEntry,
} from "./MealPlanListView";

const routeApi = getRouteApi("/meal-planners/$mealPlanId");

const INITIAL_HISTORY_LOOKBACK_DAYS = 60;

const baseHistoryFloorMonth = (): Dayjs =>
  dayjs().subtract(INITIAL_HISTORY_LOOKBACK_DAYS, "day").startOf("month");

const getCalendarCenterFromRange = ([start]: [Dayjs, Dayjs]) =>
  start.add(7, "day").toDate();

const buildPastEntries = (
  pastDates: string[],
  historyStart: Dayjs | undefined,
): MealPlanPastEntry[] => {
  const pastDatesByMonth = new Map<string, string[]>();
  for (const dateStr of pastDates) {
    const key = dateStr.slice(0, 7);
    const dates = pastDatesByMonth.get(key) || [];
    dates.push(dateStr);
    pastDatesByMonth.set(key, dates);
  }

  const entries: MealPlanPastEntry[] = [];
  const currentMonthStart = dayjs().startOf("month");
  const horizon = historyStart ?? baseHistoryFloorMonth();

  let cursor = currentMonthStart;
  while (!cursor.isBefore(horizon)) {
    const key = cursor.format("YYYY-MM");
    const datesInMonth = pastDatesByMonth.get(key);
    const isCurrentMonth = cursor.isSame(currentMonthStart, "month");

    if (datesInMonth && datesInMonth.length > 0) {
      for (const dateStr of datesInMonth) {
        entries.push({ type: "date", dateStr });
      }
    } else if (!isCurrentMonth) {
      entries.push({
        type: "emptyMonth",
        key,
        label: formatMonthYear(cursor.toDate()),
      });
    }

    cursor = cursor.subtract(1, "month");
  }

  return entries;
};

const processItemsForListView = (
  mealPlanItems: MealPlanItemSummary[],
  customMealOptions: string | null,
  historyStart: Dayjs | undefined,
): MealPlanListData => {
  const sortOrder = getMealSortOrder(customMealOptions);

  const itemsByDate = new Map<string, MealPlanItemSummary[]>();

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
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayItems = itemsByDate.get(dateStr) || [];
      dayItems.push(item);
      itemsByDate.set(dateStr, dayItems);
    });

  const today = dayjs().format("YYYY-MM-DD");
  const upcoming: string[] = [];
  const past: string[] = [];

  for (const dateStr of itemsByDate.keys()) {
    if (dateStr >= today) {
      upcoming.push(dateStr);
    } else {
      past.push(dateStr);
    }
  }

  const upcomingDates = upcoming.sort();
  const pastDates = past.sort().reverse();

  const listItemsByDate = new Map<string, MealPlanItemSummary[]>();
  const listFormattedDates = new Map<string, string>();
  for (const dateStr of [...upcomingDates, ...pastDates]) {
    listItemsByDate.set(dateStr, itemsByDate.get(dateStr) || []);
    listFormattedDates.set(dateStr, dayjs(dateStr).format("MMMM D, YYYY"));
  }

  return {
    upcomingDates,
    pastDates,
    listItemsByDate,
    listFormattedDates,
    pastEntries: buildPastEntries(pastDates, historyStart),
  };
};

const MealPlanView = ({ mealPlanId }: { mealPlanId: string }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const viewType = preferencesStore(
    (state) => state.preferences[MealPlanPreferenceKey.ViewType],
  );
  const isListView = viewType === MealPlanViewTypeOptions.List;

  const [calendarMode] = useState<MealCalendarMode>(() =>
    window.innerWidth > 600 ? "full" : "split",
  );

  const referenceRef = useRef("0");
  const dayCopyInProgressRef = useRef(false);
  const dayMoveInProgressRef = useRef(false);
  const selectedDaysInProgressRef = useRef<string[] | undefined>(undefined);
  const historyStartRef = useRef<Dayjs | undefined>(undefined);
  const historyRequestSeqRef = useRef(0);

  const [planNoLongerAvailable, setPlanNoLongerAvailable] = useState(false);
  const [historyItems, setHistoryItems] = useState<MealPlanItemSummary[]>([]);
  const [historyStart, setHistoryStart] = useState<Dayjs>();
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [calendarMealsByDate, setCalendarMealsByDate] = useState<MealsByDate>(
    {},
  );
  const [calendarSelectedDays, setCalendarSelectedDays] = useState<string[]>(
    [],
  );
  const [calendarCenter, setCalendarCenter] = useState(() => new Date());
  const [pastMealsExpanded, setPastMealsExpanded] = useState(false);
  const [listSelection, setListSelection] = useState<{
    listData: MealPlanListData;
    days: string[];
  }>();

  const handlePlanNoLongerAvailable = useEffectEvent(() => {
    showToast({
      message: t("pages.mealPlan.noLongerAvailable"),
      duration: 5000,
    });

    void navigate({ to: "/meal-planners", replace: true });
  });

  useEffect(() => {
    if (planNoLongerAvailable) handlePlanNoLongerAvailable();
  }, [planNoLongerAvailable]);

  const meQuery = useOfflineFirstQuery(serverActions.users.getMe());
  const me = meQuery.data;
  const mealPlanQuery = useOfflineFirstQuery(
    serverActions.mealPlans.getMealPlan(
      {
        id: mealPlanId,
      },
      {
        404: () => setPlanNoLongerAvailable(true),
      },
    ),
  );
  const mealPlanItemsQuery = useOfflineFirstQuery(
    serverActions.mealPlans.getMealPlanItems(
      {
        mealPlanId,
      },
      {
        404: () => setPlanNoLongerAvailable(true),
      },
    ),
  );
  const mealPlan = mealPlanQuery.data;
  const mealPlanItems = mealPlanItemsQuery.data;
  const customMealOptions = mealPlan?.customMealOptions ?? null;

  const allMealPlanItems = useMemo<MealPlanItemSummary[] | undefined>(() => {
    if (!mealPlanItems) return undefined;

    const seen = new Set<string>();
    const result: MealPlanItemSummary[] = [];
    for (const item of mealPlanItems) {
      seen.add(item.id);
      result.push(item);
    }
    for (const item of historyItems) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push(item);
    }
    return result;
  }, [mealPlanItems, historyItems]);

  const mealColors = useMemo(
    () => getMealColors(customMealOptions),
    [customMealOptions],
  );

  const mealPlanLoaded = !!mealPlan;
  const listData = useMemo<MealPlanListData | undefined>(() => {
    if (!mealPlanLoaded || !allMealPlanItems || !isListView) return undefined;
    return processItemsForListView(
      allMealPlanItems,
      customMealOptions,
      historyStart,
    );
  }, [
    mealPlanLoaded,
    allMealPlanItems,
    isListView,
    customMealOptions,
    historyStart,
  ]);

  const selectedDays = isListView
    ? listSelection && listSelection.listData === listData
      ? listSelection.days
      : []
    : calendarSelectedDays;

  const mealPlanTitle = mealPlan?.title;
  useEffect(() => {
    if (mealPlanTitle === undefined) return;
    document.title = t("generic.labeledPageTitle", { title: mealPlanTitle });
  }, [mealPlanTitle, t]);

  const loadHistory = async (targetStart?: Dayjs) => {
    const start = targetStart ?? historyStartRef.current;
    if (!start) {
      setHistoryItems((prev) => (prev.length ? [] : prev));
      historyStartRef.current = undefined;
      setHistoryStart(undefined);
      return;
    }

    const startDate = start.format("YYYY-MM-DD");
    const endDate = dayjs().format("YYYY-MM-DD");

    const seq = ++historyRequestSeqRef.current;
    setLoadingHistory(true);
    try {
      const items = await serverActions.mealPlans.getMealPlanItemsByDateRange({
        mealPlanId,
        startDate,
        endDate,
      });
      if (seq !== historyRequestSeqRef.current) return;
      if (!items) return;
      historyStartRef.current = start;
      setHistoryStart(start);
      setHistoryItems(items);
    } finally {
      if (seq === historyRequestSeqRef.current) {
        setLoadingHistory(false);
      }
    }
  };

  const extendHistoryTo = (monthStart: Dayjs) => {
    const start = monthStart.startOf("month");
    const current = historyStartRef.current;
    if (current && !start.isBefore(current)) return;
    void loadHistory(start);
  };

  const loadMealPlan = () => {
    void mealPlanQuery.refetch();
    void mealPlanItemsQuery.refetch();
    const currentViewType =
      preferencesStore.getState().preferences[MealPlanPreferenceKey.ViewType];
    if (currentViewType === MealPlanViewTypeOptions.List) {
      const floor = baseHistoryFloorMonth();
      const current = historyStartRef.current;
      const target = current?.isBefore(floor) ? current : floor;
      void loadHistory(target);
    } else {
      void loadHistory();
    }
  };

  const loadWithProgress = () => {
    loadMealPlan();
  };

  const loadInitialHistory = useEffectEvent(() => {
    const currentViewType =
      preferencesStore.getState().preferences[MealPlanPreferenceKey.ViewType];
    if (currentViewType === MealPlanViewTypeOptions.List) {
      void loadHistory(baseHistoryFloorMonth());
    }
  });

  useEffect(() => {
    loadInitialHistory();
  }, []);

  useWebsocketEvent(WSBroadcastEventType.MealPlanUpdated, (data) => {
    if (
      data.mealPlanId === mealPlanId &&
      data.reference !== referenceRef.current
    ) {
      referenceRef.current = data.reference;
      loadMealPlan();
    }
  });

  const onCalendarVisibleRange = (range: [Dayjs, Dayjs]) => {
    setCalendarCenter(getCalendarCenterFromRange(range));
    const visibleStart = range[0].startOf("month");
    if (!visibleStart.isAfter(baseHistoryFloorMonth())) {
      extendHistoryTo(visibleStart);
    }
  };

  const showMorePastMonths = () => {
    const from = historyStartRef.current ?? baseHistoryFloorMonth();
    extendHistoryTo(from.subtract(1, "month"));
  };

  const _addItems = async (items: MealPlanItemDraft[]) => {
    if (items.length === 0) return;

    const loading = loadingService.start();

    const reference = crypto.randomUUID();
    referenceRef.current = reference;

    const result = await serverActions.mealPlans.createMealPlanItems({
      mealPlanId,
      items,
      reference,
    });
    loading.dismiss();
    if (!result) return;

    loadMealPlan();
  };

  const newMealPlanItem = async () => {
    const data = await openNewMealPlanItemModal({
      scheduledDate: selectedDays[0] ?? dayjs().format("YYYY-MM-DD"),
      customMealOptions,
    });
    if (!data?.items) return;
    void _addItems(data.items);
  };

  const itemClicked = async (mealItem: MealPlanItemSummary) => {
    const data = await openMealPlanItemDetailsModal({
      mealItem,
      mealPlanId,
      customMealOptions,
    });
    if (data?.refresh) loadWithProgress();
  };

  const itemMoved = async ({
    dateStamp,
    mealItem,
  }: MealCalendarItemMovedEvent) => {
    const data = await openNewMealPlanItemModal({
      isEditing: true,
      inputType: mealItem.recipe ? "recipe" : "manualEntry",
      title: mealItem.title,
      recipe: mealItem.recipe,
      scheduledDate: dateStamp,
      meal: mealItem.meal,
      notes: mealItem.notes,
      customMealOptions,
    });
    const item = data?.items[0];
    if (!item) return;

    const loading = loadingService.start();
    const reference = crypto.randomUUID();
    referenceRef.current = reference;
    const result = await serverActions.mealPlans.updateMealPlanItems({
      mealPlanId,
      items: [{ id: mealItem.id, ...item }],
      reference,
    });
    loading.dismiss();
    if (!result) return;

    loadWithProgress();
  };

  const getItemsOnDay = (dateStamp: string): MealPlanItemSummary[] => {
    const day = dayjs(dateStamp);
    if (isListView) {
      return listData?.listItemsByDate.get(day.format("YYYY-MM-DD")) || [];
    }
    return (
      calendarMealsByDate[day.year()]?.[day.month() + 1]?.[day.date()]?.items ||
      []
    );
  };

  const getSelectedMealItemCount = (): number =>
    selectedDays
      .map((dateStamp) => getItemsOnDay(dateStamp).length)
      .reduce((acc, el) => acc + el, 0);

  const getSelectedItems = () =>
    selectedDays.map((selectedDay) => getItemsOnDay(selectedDay)).flat();

  const emptyDaysSelectedAlert = async () => {
    await showAlert({
      header: t("pages.mealPlan.modal.emptyDays.header"),
      message: t("pages.mealPlan.modal.emptyDays.message"),
      buttons: [
        {
          text: t("generic.okay"),
          role: "cancel",
        },
      ],
    });
  };

  const startBulkCopy = () => {
    dayCopyInProgressRef.current = false;

    if (getSelectedMealItemCount() === 0) {
      void emptyDaysSelectedAlert();
      return;
    }

    const daysToCopy = Array.from(selectedDays);
    void showAlert({
      header: t("pages.mealPlan.modal.copy.header"),
      message: t("pages.mealPlan.modal.copy.message"),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
        },
        {
          text: t("generic.okay"),
          handler: () => {
            dayCopyInProgressRef.current = true;
            selectedDaysInProgressRef.current = daysToCopy;
          },
        },
      ],
    });
  };

  const startBulkMove = () => {
    dayMoveInProgressRef.current = false;

    if (getSelectedMealItemCount() === 0) {
      void emptyDaysSelectedAlert();
      return;
    }

    const daysToMove = Array.from(selectedDays);
    void showAlert({
      header: t("pages.mealPlan.modal.move.header"),
      message: t("pages.mealPlan.modal.move.message"),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
        },
        {
          text: t("generic.okay"),
          handler: () => {
            dayMoveInProgressRef.current = true;
            selectedDaysInProgressRef.current = daysToMove;
          },
        },
      ],
    });
  };

  const _deleteItemsOnDays = async (days: string[]) => {
    const itemIds = days
      .map((day) => getItemsOnDay(day).map((item) => item.id))
      .flat();

    const loading = loadingService.start();
    const reference = crypto.randomUUID();
    referenceRef.current = reference;
    const result = await serverActions.mealPlans.deleteMealPlanItems({
      mealPlanId,
      ids: itemIds,
      reference,
    });
    loading.dismiss();
    if (!result) return;

    loadWithProgress();
  };

  const bulkDelete = () => {
    if (getSelectedMealItemCount() === 0) {
      void emptyDaysSelectedAlert();
      return;
    }

    const daysToDelete = [...selectedDays];
    const daysList = daysToDelete
      .map((day) => dayjs(day).format("MMM D"))
      .join(", ");

    void showAlert({
      header: t("pages.mealPlan.modal.delete.header"),
      message: t("pages.mealPlan.modal.delete.message", { daysList }),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
        },
        {
          text: t("generic.delete"),
          variant: "destructive",
          handler: () => {
            void _deleteItemsOnDays(daysToDelete);
          },
        },
      ],
    });
  };

  const bulkPinRecipes = () => {
    if (getSelectedMealItemCount() === 0) {
      void emptyDaysSelectedAlert();
      return;
    }

    void openMealPlanBulkPinModal({
      mealItems: getSelectedItems(),
    });
  };

  const bulkAddToShoppingList = async () => {
    if (getSelectedMealItemCount() === 0) {
      void emptyDaysSelectedAlert();
      return;
    }

    const selectedRecipes = getSelectedItems()
      .map((item) => item.recipe)
      .filter((recipe) => recipe !== null);

    if (selectedRecipes.length === 0) {
      await showAlert({
        header: t("pages.mealPlan.modal.noRecipes.header"),
        message: t("pages.mealPlan.modal.noRecipes.message"),
        buttons: [
          {
            text: t("generic.okay"),
          },
        ],
      });
      return;
    }

    void openAddRecipeToShoppingListModal({
      recipes: selectedRecipes,
      scale: "1",
    });
  };

  const launchNutritionCalculator = (recipeIds: string[]) => {
    void navigate({
      to: "/tools/nutrition",
      state: (prev) => ({ ...prev, recipeIds }),
    });
  };

  const calculateDaysNutrition = async () => {
    if (getSelectedMealItemCount() === 0) {
      void emptyDaysSelectedAlert();
      return;
    }

    const recipeIds: string[] = [];
    let manualEntryCount = 0;
    for (const item of getSelectedItems()) {
      if (item.recipe) {
        recipeIds.push(item.recipe.id);
      } else {
        manualEntryCount += 1;
      }
    }

    if (recipeIds.length === 0) {
      await showAlert({
        header: t("pages.mealPlan.modal.noRecipesNutrition.header"),
        message: t("pages.mealPlan.modal.noRecipesNutrition.message"),
        buttons: [{ text: t("generic.okay") }],
      });
      return;
    }

    if (manualEntryCount > 0) {
      await showAlert({
        header: t("pages.mealPlan.modal.manualEntriesNutrition.header"),
        message: t("pages.mealPlan.modal.manualEntriesNutrition.message"),
        buttons: [
          { text: t("generic.cancel"), role: "cancel" },
          {
            text: t("generic.confirm"),
            handler: () => launchNutritionCalculator(recipeIds),
          },
        ],
      });
      return;
    }

    launchNutritionCalculator(recipeIds);
  };

  const _moveSelectedTo = async (dateStamp: string) => {
    const selectedDaysInProgress = selectedDaysInProgressRef.current;
    if (!selectedDaysInProgress)
      throw new Error("Move initiated with no selected days");

    const dayDiff = dayjs(dateStamp).diff(selectedDaysInProgress[0], "day");

    const updatedItems = selectedDaysInProgress
      .map((selectedDay) =>
        getItemsOnDay(selectedDay).map((item) => ({
          id: item.id,
          title: item.title,
          recipeId: item.recipeId,
          scheduledDate: dayjs(item.scheduledDate)
            .add(dayDiff, "day")
            .format("YYYY-MM-DD"),
          meal: item.meal,
          notes: item.notes,
        })),
      )
      .flat();

    const loading = loadingService.start();
    const reference = crypto.randomUUID();
    referenceRef.current = reference;
    const result = await serverActions.mealPlans.updateMealPlanItems({
      mealPlanId,
      items: updatedItems,
      reference,
    });
    loading.dismiss();
    if (!result) return;

    loadWithProgress();
  };

  const _copySelectedTo = async (dateStamp: string) => {
    const selectedDaysInProgress = selectedDaysInProgressRef.current;
    if (!selectedDaysInProgress)
      throw new Error("Move initiated with no selected days");

    const dayDiff = dayjs(dateStamp).diff(selectedDaysInProgress[0], "day");

    const newItems = selectedDaysInProgress
      .map((selectedDay) =>
        getItemsOnDay(selectedDay).map((item) => ({
          title: item.title,
          recipeId: item.recipeId,
          scheduledDate: dayjs(item.scheduledDate)
            .add(dayDiff, "day")
            .format("YYYY-MM-DD"),
          meal: item.meal,
          notes: item.notes,
        })),
      )
      .flat();

    const loading = loadingService.start();
    const reference = crypto.randomUUID();
    referenceRef.current = reference;
    const result = await serverActions.mealPlans.createMealPlanItems({
      mealPlanId,
      items: newItems,
      reference,
    });
    loading.dismiss();
    if (!result) return;

    loadWithProgress();
  };

  const dayClicked = (date: Date) => {
    const dateStamp = dayjs(date).format("YYYY-MM-DD");
    if (!dayMoveInProgressRef.current && !dayCopyInProgressRef.current) return;

    const selectedDaysInProgress = selectedDaysInProgressRef.current || [];
    const selectedDayList = selectedDaysInProgress
      .map((selectedDay) => dayjs(selectedDay).format("MMM D"))
      .join(", ");
    const destDay = dayjs(dateStamp).format("MMM D");
    const isMultiple = selectedDaysInProgress.length > 1;

    if (dayCopyInProgressRef.current) {
      void showAlert({
        header: t("pages.mealPlan.modal.copyConfirm.header"),
        message: isMultiple
          ? t("pages.mealPlan.modal.copyConfirm.messageMultiple", {
              selectedDayList,
              destDay,
            })
          : t("pages.mealPlan.modal.copyConfirm.messageSingle", {
              selectedDayList,
              destDay,
            }),
        buttons: [
          {
            text: t("generic.cancel"),
            role: "cancel",
            handler: () => {
              dayCopyInProgressRef.current = false;
            },
          },
          {
            text: t("pages.mealPlan.modal.copyConfirm.change"),
          },
          {
            text: t("generic.okay"),
            handler: () => {
              dayCopyInProgressRef.current = false;
              void _copySelectedTo(dateStamp);
            },
          },
        ],
      });
    }

    if (dayMoveInProgressRef.current) {
      void showAlert({
        header: t("pages.mealPlan.modal.moveConfirm.header"),
        message: isMultiple
          ? t("pages.mealPlan.modal.moveConfirm.messageMultiple", {
              selectedDayList,
              destDay,
            })
          : t("pages.mealPlan.modal.moveConfirm.messageSingle", {
              selectedDayList,
              destDay,
            }),
        buttons: [
          {
            text: t("generic.cancel"),
            role: "cancel",
            handler: () => {
              dayMoveInProgressRef.current = false;
            },
          },
          {
            text: t("pages.mealPlan.modal.moveConfirm.change"),
          },
          {
            text: t("generic.okay"),
            handler: () => {
              dayMoveInProgressRef.current = false;
              void _moveSelectedTo(dateStamp);
            },
          },
        ],
      });
    }
  };

  const toggleDaySelection = (dateStr: string) => {
    if (!listData) return;
    const nextDays = selectedDays.includes(dateStr)
      ? selectedDays.filter((d) => d !== dateStr)
      : [...selectedDays, dateStr];
    setListSelection({ listData, days: nextDays });
  };

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/meal-planners" }} />}
        title={t("pages.mealPlan.title", { name: mealPlan?.title })}
        end={
          <MealPlanPopover
            mealPlanId={mealPlanId}
            mealPlan={mealPlan}
            isOwner={!!mealPlan && me?.id === mealPlan.user.id}
            setReference={(reference) => {
              referenceRef.current = reference;
            }}
            calendarCenter={isListView ? undefined : calendarCenter}
            viewType={viewType}
            onReload={loadWithProgress}
            onViewTypeChange={() => {
              setCalendarCenter(new Date());
              loadWithProgress();
            }}
            onCopy={startBulkCopy}
            onMove={startBulkMove}
            onDelete={bulkDelete}
            onPinRecipes={bulkPinRecipes}
            onBulkAddToShoppingList={() => void bulkAddToShoppingList()}
            onCalculateNutrition={() => void calculateDaysNutrition()}
          />
        }
      />
      <PageContent padded={false} className="pt-4 pb-24">
        {!allMealPlanItems && (
          <NullState icon={<Spinner />}>
            <p className="text-muted-foreground">
              {t("pages.mealPlan.loading")}
            </p>
          </NullState>
        )}
        {allMealPlanItems &&
          (isListView ? (
            listData && (
              <MealPlanListView
                listData={listData}
                mealColors={mealColors}
                selectedDays={selectedDays}
                pastMealsExpanded={pastMealsExpanded}
                loadingHistory={loadingHistory}
                onToggleDaySelection={toggleDaySelection}
                onPastMealsExpandedChange={setPastMealsExpanded}
                onItemClicked={(item) => void itemClicked(item)}
                onShowMorePastMonths={showMorePastMonths}
              />
            )
          ) : (
            <div>
              <MealCalendar
                customMealOptions={customMealOptions}
                mealPlanItems={allMealPlanItems}
                onSelectedDaysChange={setCalendarSelectedDays}
                onItemClicked={(item) => void itemClicked(item)}
                onItemMoved={(event) => void itemMoved(event)}
                onDayClicked={dayClicked}
                onMealsByDateChange={setCalendarMealsByDate}
                onVisibleRangeChange={onCalendarVisibleRange}
                enableEditing
                mode={calendarMode}
              />
            </div>
          ))}
      </PageContent>
      <Fab
        aria-label={t("pages.newMealPlanItemModal.title.new")}
        onClick={() => void newMealPlanItem()}
      >
        <PlusIcon />
      </Fab>
    </>
  );
};

export const MealPlanPage = () => {
  const { mealPlanId } = routeApi.useParams();

  return <MealPlanView key={mealPlanId} mealPlanId={mealPlanId} />;
};
