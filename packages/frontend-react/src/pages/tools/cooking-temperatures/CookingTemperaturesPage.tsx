import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  DropletIcon,
  FlameIcon,
  InfoIcon,
  SearchIcon,
  ShieldIcon,
  TimerIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { fahrenheitToCelsius } from "@recipesage/util/shared";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { InfoBlock } from "../../../components/info-block/InfoBlock";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  cookingTemperatureData,
  type CookingTemperatureCategory,
  type CookingTemperatureEntry,
} from "./cookingTemperatureData";

interface DisplayEntry {
  entry: CookingTemperatureEntry;
  label: string;
  state: string;
  cue: string;
  tempDisplay: string;
  searchFields: string[];
}

interface DisplayGroup {
  category: CookingTemperatureCategory;
  title: string;
  entries: DisplayEntry[];
}

type ChipColor = "tertiary" | "warning" | "danger" | "success" | "medium";

const CHIP_COLOR_CLASSES: Record<ChipColor, string> = {
  tertiary:
    "border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  warning:
    "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
  success:
    "border-green-600/40 bg-green-600/10 text-green-800 dark:text-green-300",
  medium: "border-border bg-muted text-muted-foreground",
};

const SEARCH_DEBOUNCE_MS = 100;

const normalize = (value: string): string =>
  value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const InfoChip = ({
  color,
  icon,
  children,
}: {
  color: ChipColor;
  icon?: ReactNode;
  children: ReactNode;
}) => (
  <span
    className={cn(
      "inline-flex h-[22px] items-center gap-[3px] rounded-full border ps-1.5 pe-2 text-[0.7rem] leading-none whitespace-nowrap [&_svg]:size-[0.85rem]",
      CHIP_COLOR_CLASSES[color],
    )}
  >
    {icon}
    <span>{children}</span>
  </span>
);

export const CookingTemperaturesPage = () => {
  const { t } = useTranslation();

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const timeout = setTimeout(
      () => setSearchTerm(searchInput),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const allGroups = useMemo((): DisplayGroup[] => {
    const toDisplay = (entry: CookingTemperatureEntry): DisplayEntry => {
      const label = t(entry.labelKey);
      const state = entry.stateKey ? t(entry.stateKey) : "";
      const cue = entry.cueKey ? t(entry.cueKey) : "";

      let tempDisplay = "";

      if (entry.fahrenheit !== undefined) {
        tempDisplay = t("pages.cookingTemperatures.tempValue", {
          c: Math.round(fahrenheitToCelsius(entry.fahrenheit)),
          f: entry.fahrenheit,
        });
      } else if (entry.fahrenheitRange) {
        const [fMin, fMax] = entry.fahrenheitRange;
        tempDisplay = t("pages.cookingTemperatures.tempRange", {
          cMin: Math.round(fahrenheitToCelsius(fMin)),
          cMax: Math.round(fahrenheitToCelsius(fMax)),
          fMin,
          fMax,
        });
      }

      const categoryTitle = t(
        cookingTemperatureData.categoryTitleKeys[entry.category],
      );

      const searchFields = [
        normalize(label),
        normalize(state),
        normalize(cue),
        normalize(categoryTitle),
        ...(entry.searchAliases?.map((alias) => normalize(alias)) ?? []),
      ].filter((field) => field.length > 0);

      return {
        entry,
        label,
        state,
        cue,
        tempDisplay,
        searchFields,
      };
    };

    const entriesByCategory = new Map<
      CookingTemperatureCategory,
      DisplayEntry[]
    >();

    for (const entry of cookingTemperatureData.entries) {
      const display = toDisplay(entry);
      const bucket = entriesByCategory.get(entry.category) ?? [];
      bucket.push(display);
      entriesByCategory.set(entry.category, bucket);
    }

    return cookingTemperatureData.categories
      .filter((category) => entriesByCategory.has(category))
      .map((category) => ({
        category,
        title: t(cookingTemperatureData.categoryTitleKeys[category]),
        entries: entriesByCategory.get(category) ?? [],
      }));
  }, [t]);

  const visibleGroups = useMemo((): DisplayGroup[] => {
    const term = normalize(searchTerm.trim());
    if (!term) return allGroups;

    const tokens = term.split(/\s+/).filter(Boolean);

    return allGroups
      .map((group) => ({
        ...group,
        entries: group.entries.filter((display) =>
          tokens.every((token) =>
            display.searchFields.some((field) => field.includes(token)),
          ),
        ),
      }))
      .filter((group) => group.entries.length > 0);
  }, [allGroups, searchTerm]);

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/tools" }} />}
        title={t("pages.cookingTemperatures.title")}
      />
      <PageContent>
        <div className="mx-auto max-w-page pb-[25vh]">
          <InfoBlock
            className="mb-3"
            icon={<ShieldIcon />}
            ariaLabel={t("pages.cookingTemperatures.safety.title")}
            title={t("pages.cookingTemperatures.safety.title")}
            source={<p>{t("pages.cookingTemperatures.safety.source")}</p>}
          >
            <p>{t("pages.cookingTemperatures.safety.safeMin")}</p>
            <p>{t("pages.cookingTemperatures.safety.preference")}</p>
            <p>{t("pages.cookingTemperatures.safety.carryover")}</p>
          </InfoBlock>

          <InputGroup className="mb-3 h-10">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              dir="auto"
              autoComplete="off"
              placeholder={t("pages.cookingTemperatures.searchPlaceholder")}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </InputGroup>

          {visibleGroups.length === 0 && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center px-4 py-12 text-center text-muted-foreground"
            >
              <InfoIcon aria-hidden="true" className="mb-2 size-8" />
              <p>{t("pages.cookingTemperatures.noResults")}</p>
            </div>
          )}

          {visibleGroups.map((group) => (
            <section
              key={group.category}
              className="mb-4 overflow-clip rounded-[10px] border"
            >
              <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 flex min-h-8 items-center bg-muted px-3.5 py-1.5">
                <h2 className="text-[0.78rem] font-bold tracking-[0.06em] uppercase">
                  {group.title}
                </h2>
              </div>
              {group.entries.map((display) => (
                <div
                  key={display.entry.key}
                  className="flex items-center border-b py-2.5 ps-4 pe-3 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[0.98rem] font-semibold">
                      {display.label}
                    </h3>
                    {display.state && (
                      <p className="mt-[3px] text-[0.82rem] text-muted-foreground">
                        {display.state}
                      </p>
                    )}
                  </div>
                  <div className="ms-3 flex max-w-[56%] min-w-[120px] flex-col items-end justify-center text-end">
                    {display.entry.visualCueOnly ? (
                      <p className="text-[0.82rem] leading-[1.35] text-muted-foreground">
                        {display.cue}
                      </p>
                    ) : (
                      <p className="text-[1.02rem] leading-[1.2] font-bold tabular-nums">
                        {display.tempDisplay}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap justify-end gap-1">
                      {display.entry.tempKind === "oil" ? (
                        <InfoChip color="tertiary" icon={<DropletIcon />}>
                          {t("pages.cookingTemperatures.chip.oilTemp")}
                        </InfoChip>
                      ) : (
                        display.entry.tempKind === "smokePoint" && (
                          <InfoChip color="warning" icon={<FlameIcon />}>
                            {t("pages.cookingTemperatures.chip.smokePoint")}
                          </InfoChip>
                        )
                      )}
                      {display.entry.isDangerZone ? (
                        <InfoChip color="danger" icon={<TriangleAlertIcon />}>
                          {t("pages.cookingTemperatures.chip.bacteriaZone")}
                        </InfoChip>
                      ) : display.entry.isSafetyMinimum ? (
                        <InfoChip color="success" icon={<ShieldIcon />}>
                          {t("pages.cookingTemperatures.chip.usdaMinimum")}
                        </InfoChip>
                      ) : (
                        !display.entry.tempKind &&
                        !display.entry.visualCueOnly && (
                          <InfoChip color="medium">
                            {t("pages.cookingTemperatures.chip.preference")}
                          </InfoChip>
                        )
                      )}
                      {!!display.entry.restMinutes && (
                        <InfoChip color="warning" icon={<TimerIcon />}>
                          {t("pages.cookingTemperatures.chip.rest", {
                            minutes: display.entry.restMinutes,
                          })}
                        </InfoChip>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      </PageContent>
    </>
  );
};
