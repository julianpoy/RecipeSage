import { Component, inject, type OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TranslateService } from "@ngx-translate/core";
import { fahrenheitToCelsius } from "@recipesage/util/shared";
import { addIcons } from "ionicons";
import {
  shield,
  timer,
  informationCircle,
  water,
  warning,
  flame,
} from "ionicons/icons";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonNote,
  IonIcon,
  IonChip,
} from "@ionic/angular/standalone";

import { RouteMap } from "../../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { InfoBlockComponent } from "../../../components/info-block/info-block.component";
import {
  COOKING_TEMPERATURES,
  COOKING_TEMPERATURE_CATEGORIES,
  type CookingTemperatureEntry,
  type CookingTemperatureCategory,
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

@Component({
  standalone: true,
  selector: "page-cooking-temperatures",
  templateUrl: "cooking-temperatures.page.html",
  styleUrls: ["cooking-temperatures.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonItemDivider,
    IonLabel,
    IonNote,
    IonIcon,
    IonChip,
    InfoBlockComponent,
  ],
})
export class CookingTemperaturesPage implements OnInit {
  private translate = inject(TranslateService);

  defaultBackHref: string = RouteMap.ToolsPage.getPath();

  searchTerm = "";

  private allGroups: DisplayGroup[] = [];
  visibleGroups: DisplayGroup[] = [];

  constructor() {
    addIcons({
      shield,
      timer,
      informationCircle,
      water,
      warning,
      flame,
    });
  }

  ngOnInit() {
    this.buildGroups();
    this.applyFilter();
  }

  onSearchInput() {
    this.applyFilter();
  }

  private buildGroups() {
    const entriesByCategory = new Map<
      CookingTemperatureCategory,
      DisplayEntry[]
    >();

    for (const entry of COOKING_TEMPERATURES) {
      const display = this.toDisplay(entry);
      const bucket = entriesByCategory.get(entry.category) ?? [];
      bucket.push(display);
      entriesByCategory.set(entry.category, bucket);
    }

    this.allGroups = COOKING_TEMPERATURE_CATEGORIES.filter((category) =>
      entriesByCategory.has(category),
    ).map((category) => ({
      category,
      title: this.translate.instant(
        `pages.cookingTemperatures.categories.${category}.title`,
      ),
      entries: entriesByCategory.get(category) ?? [],
    }));
  }

  private normalize(value: string): string {
    return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  private toDisplay(entry: CookingTemperatureEntry): DisplayEntry {
    const label = this.translate.instant(
      `pages.cookingTemperatures.items.${entry.key}.label`,
    );
    const state = this.translateOptional(
      `pages.cookingTemperatures.items.${entry.key}.state`,
    );
    const cue = this.translateOptional(
      `pages.cookingTemperatures.items.${entry.key}.cue`,
    );

    let tempDisplay = "";

    if (entry.fahrenheit !== undefined) {
      tempDisplay = this.translate.instant(
        "pages.cookingTemperatures.tempValue",
        {
          c: Math.round(fahrenheitToCelsius(entry.fahrenheit)),
          f: entry.fahrenheit,
        },
      );
    } else if (entry.fahrenheitRange) {
      const [fMin, fMax] = entry.fahrenheitRange;
      tempDisplay = this.translate.instant(
        "pages.cookingTemperatures.tempRange",
        {
          cMin: Math.round(fahrenheitToCelsius(fMin)),
          cMax: Math.round(fahrenheitToCelsius(fMax)),
          fMin,
          fMax,
        },
      );
    }

    const categoryTitle = this.translate.instant(
      `pages.cookingTemperatures.categories.${entry.category}.title`,
    );

    const searchFields = [
      this.normalize(label),
      this.normalize(state),
      this.normalize(cue),
      this.normalize(categoryTitle),
      ...(entry.searchAliases?.map((a) => this.normalize(a)) ?? []),
    ].filter((s) => s.length > 0);

    return {
      entry,
      label,
      state,
      cue,
      tempDisplay,
      searchFields,
    };
  }

  private translateOptional(key: string): string {
    const value = this.translate.instant(key);
    return value === key ? "" : value;
  }

  private applyFilter() {
    const term = this.normalize(this.searchTerm.trim());
    if (!term) {
      this.visibleGroups = this.allGroups;
      return;
    }

    const tokens = term.split(/\s+/).filter(Boolean);

    this.visibleGroups = this.allGroups
      .map((group) => {
        const filtered = group.entries.filter((display) =>
          tokens.every((token) =>
            display.searchFields.some((field) => field.includes(token)),
          ),
        );
        return { ...group, entries: filtered };
      })
      .filter((group) => group.entries.length > 0);
  }

  trackGroup(_index: number, group: DisplayGroup): string {
    return group.category;
  }

  trackEntry(_index: number, display: DisplayEntry): string {
    return display.entry.key;
  }
}
