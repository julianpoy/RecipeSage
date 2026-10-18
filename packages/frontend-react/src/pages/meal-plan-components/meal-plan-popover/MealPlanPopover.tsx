import { useId, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  AppleIcon,
  CopyIcon,
  PencilIcon,
  PinIcon,
  PrinterIcon,
  ScissorsIcon,
  ShareIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import {
  GlobalPreferenceKey,
  MealPlanPreferenceKey,
  MealPlanStartOfWeekOptions,
  MealPlanViewTypeOptions,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showAlert } from "../../../components/dialogs/showAlert";
import type { TranslationKey } from "../../../i18n/TranslationKey";
import { loadingService } from "../../../services/loadingService";
import type { RouterOutputs } from "../../../services/server-actions/ActionsBase";
import { serverActions } from "../../../services/serverActions";
import { preferencesStore } from "../../../stores/preferencesStore";
import { printUrls } from "../../../utils/printUrls";
import { openICalMealPlanModal } from "../ical-meal-plan-modal/openICalMealPlanModal";
import { openUpdateMealPlanModal } from "../update-meal-plan-modal/openUpdateMealPlanModal";

type MealPlan = RouterOutputs["mealPlans"]["getMealPlan"];

const START_OF_WEEK_OPTIONS: {
  value: MealPlanStartOfWeekOptions;
  label: TranslationKey;
}[] = [
  {
    value: MealPlanStartOfWeekOptions.Sunday,
    label: "pages.mealPlanPopover.options.startWeekOn.sunday",
  },
  {
    value: MealPlanStartOfWeekOptions.Monday,
    label: "pages.mealPlanPopover.options.startWeekOn.monday",
  },
];

const VIEW_TYPE_OPTIONS: {
  value: MealPlanViewTypeOptions;
  label: TranslationKey;
}[] = [
  {
    value: MealPlanViewTypeOptions.Calendar,
    label: "pages.mealPlanPopover.options.viewType.calendar",
  },
  {
    value: MealPlanViewTypeOptions.List,
    label: "pages.mealPlanPopover.options.viewType.list",
  },
];

const parseStartOfWeek = (value: unknown) =>
  Object.values(MealPlanStartOfWeekOptions).find((option) => option === value);

const parseViewType = (value: unknown) =>
  Object.values(MealPlanViewTypeOptions).find((option) => option === value);

const SectionHeader = ({ children }: { children: ReactNode }) => (
  <h2 className="pt-2 text-base font-medium">{children}</h2>
);

const ActionButton = ({
  icon,
  destructive = false,
  disabled = false,
  onClick,
  children,
}: {
  icon: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <Button
    variant={destructive ? "destructive" : "default"}
    className="h-auto min-h-9 w-full whitespace-normal"
    disabled={disabled}
    onClick={onClick}
  >
    {icon}
    {children}
  </Button>
);

export const MealPlanPopover = ({
  mealPlanId,
  mealPlan,
  isOwner,
  setReference,
  calendarCenter,
  viewType: viewTypeOverride,
  onReload,
  onViewTypeChange,
  onCopy,
  onMove,
  onDelete,
  onPinRecipes,
  onBulkAddToShoppingList,
  onCalculateNutrition,
}: {
  mealPlanId: string;
  mealPlan: MealPlan | undefined;
  isOwner: boolean;
  setReference: (reference: string) => void;
  calendarCenter?: Date;
  viewType?: string;
  onReload: () => void;
  onViewTypeChange: () => void;
  onCopy: () => void;
  onMove: () => void;
  onDelete: () => void;
  onPinRecipes: () => void;
  onBulkAddToShoppingList: () => void;
  onCalculateNutrition: () => void;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const startOfWeekSelectId = useId();
  const viewTypeSelectId = useId();
  const [open, setOpen] = useState(false);
  const startOfWeek = preferencesStore(
    (state) => state.preferences[MealPlanPreferenceKey.StartOfWeek],
  );
  const viewType = preferencesStore(
    (state) => state.preferences[MealPlanPreferenceKey.ViewType],
  );

  const dismiss = () => setOpen(false);

  const runAndDismiss = (action: () => void) => () => {
    dismiss();
    action();
  };

  const ical = () => {
    void openICalMealPlanModal({ mealPlanId });
    dismiss();
  };

  const print = () => {
    const preferences = preferencesStore.getState().preferences;
    const printViewType =
      viewTypeOverride || preferences[MealPlanPreferenceKey.ViewType];

    window.open(
      printUrls.mealPlan(mealPlanId, {
        viewType: printViewType,
        calendarMonth: calendarCenter
          ? calendarCenter.getMonth() + 1
          : undefined,
        calendarYear: calendarCenter ? calendarCenter.getFullYear() : undefined,
        startOfWeek:
          preferences[MealPlanPreferenceKey.StartOfWeek] || undefined,
        preferredLanguage:
          preferences[GlobalPreferenceKey.Language] || undefined,
        today: dayjs().format("YYYY-MM-DD"),
      }),
    );

    dismiss();
  };

  const _deleteMealPlan = async () => {
    const loading = loadingService.start();

    const reference = crypto.randomUUID();
    setReference(reference);

    const result = isOwner
      ? await serverActions.mealPlans.deleteMealPlan({
          id: mealPlanId,
          reference,
        })
      : await serverActions.mealPlans.detachMealPlan({
          id: mealPlanId,
          reference,
        });
    loading.dismiss();
    if (!result) return;

    dismiss();
    void navigate({ to: "/meal-planners", replace: true });
  };

  const deleteMealPlan = () => {
    dismiss();
    void showAlert({
      header: isOwner
        ? t("pages.mealPlanPopover.deletePlan.header")
        : t("pages.mealPlanPopover.removeSelfFromPlan.header"),
      message: isOwner
        ? t("pages.mealPlanPopover.deletePlan.message")
        : t("pages.mealPlanPopover.removeSelfFromPlan.message"),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
          handler: () => {},
        },
        {
          text: isOwner ? t("generic.delete") : t("generic.confirm"),
          variant: "destructive",
          handler: () => {
            void _deleteMealPlan();
          },
        },
      ],
    });
  };

  const updateMealPlan = async () => {
    if (!mealPlan) return;
    dismiss();
    await openUpdateMealPlanModal({ mealPlan });
    onReload();
  };

  const isListView = viewType === MealPlanViewTypeOptions.List;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit aria-expanded:bg-white/10 aria-expanded:text-inherit"
            aria-label={t("generic.options")}
          />
        }
      >
        <SlidersHorizontalIcon className="size-6" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-(--available-height) w-80 max-w-[calc(100vw-2rem)] gap-2 overflow-y-auto"
      >
        <SectionHeader>
          {t("pages.mealPlanPopover.options.title")}
        </SectionHeader>

        <div className="flex min-h-11 flex-wrap items-center gap-2 border-b py-1">
          <label
            htmlFor={startOfWeekSelectId}
            className="min-w-0 flex-1 text-sm"
          >
            {t("pages.mealPlanPopover.options.startWeekOn.title")}
          </label>
          <Select
            value={startOfWeek}
            items={START_OF_WEEK_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.label),
            }))}
            onValueChange={(value) => {
              const option = parseStartOfWeek(value);
              if (!option) return;
              preferencesStore
                .getState()
                .setPreference(MealPlanPreferenceKey.StartOfWeek, option);
              onReload();
            }}
          >
            <SelectTrigger id={startOfWeekSelectId} className="h-9 max-w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {START_OF_WEEK_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-h-11 flex-wrap items-center gap-2 border-b py-1">
          <label htmlFor={viewTypeSelectId} className="min-w-0 flex-1 text-sm">
            {t("pages.mealPlanPopover.options.viewType.title")}
          </label>
          <Select
            value={viewType}
            items={VIEW_TYPE_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.label),
            }))}
            onValueChange={(value) => {
              const option = parseViewType(value);
              if (!option) return;
              preferencesStore
                .getState()
                .setPreference(MealPlanPreferenceKey.ViewType, option);
              onViewTypeChange();
            }}
          >
            <SelectTrigger id={viewTypeSelectId} className="h-9 max-w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEW_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SectionHeader>
          {t("pages.mealPlanPopover.actions.title")}
        </SectionHeader>

        <ActionButton
          icon={<PinIcon data-icon="inline-start" />}
          onClick={runAndDismiss(onPinRecipes)}
        >
          {t("pages.mealPlanPopover.actions.pinRecipesOpen")}
        </ActionButton>
        <ActionButton
          icon={<ShoppingCartIcon data-icon="inline-start" />}
          onClick={runAndDismiss(onBulkAddToShoppingList)}
        >
          {t("pages.mealPlanPopover.actions.addToShoppingList")}
        </ActionButton>
        <ActionButton
          icon={<AppleIcon data-icon="inline-start" />}
          onClick={runAndDismiss(onCalculateNutrition)}
        >
          {t("pages.mealPlanPopover.actions.calculateNutrition")}
        </ActionButton>
        <ActionButton
          icon={<CopyIcon data-icon="inline-start" />}
          disabled={isListView}
          onClick={runAndDismiss(onCopy)}
        >
          {t("pages.mealPlanPopover.actions.copyDays")}
        </ActionButton>
        <ActionButton
          icon={<ScissorsIcon data-icon="inline-start" />}
          disabled={isListView}
          onClick={runAndDismiss(onMove)}
        >
          {t("pages.mealPlanPopover.actions.moveDays")}
        </ActionButton>
        <ActionButton
          icon={<Trash2Icon data-icon="inline-start" />}
          destructive
          onClick={runAndDismiss(onDelete)}
        >
          {t("pages.mealPlanPopover.actions.deleteDays")}
        </ActionButton>
        <ActionButton
          icon={<PencilIcon data-icon="inline-start" />}
          disabled={!isOwner}
          onClick={() => void updateMealPlan()}
        >
          {t("pages.mealPlanPopover.actions.update")}
        </ActionButton>
        <ActionButton
          icon={<ShareIcon data-icon="inline-start" />}
          onClick={ical}
        >
          {t("pages.mealPlanPopover.actions.ical")}
        </ActionButton>
        <ActionButton
          icon={<PrinterIcon data-icon="inline-start" />}
          onClick={print}
        >
          {t("pages.mealPlanPopover.actions.print")}
        </ActionButton>

        <SectionHeader>
          {t("pages.mealPlanPopover.dangerZone.title")}
        </SectionHeader>

        <ActionButton
          icon={<Trash2Icon data-icon="inline-start" />}
          destructive
          onClick={deleteMealPlan}
        >
          {t("pages.mealPlanPopover.dangerZone.delete")}
        </ActionButton>
      </PopoverContent>
    </Popover>
  );
};
