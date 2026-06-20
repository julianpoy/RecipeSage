import { Component, Input, OnInit, inject } from "@angular/core";
import {
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonButton,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonFooter,
} from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import fractionjs from "fraction.js";
import { System } from "unitz-ts";
import {
  getAnchorMeasurement,
  parseIngredients,
  parseYieldCount,
  stripIngredient,
} from "@recipesage/util/shared";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { ParsedIngredient } from "../../services/recipe.service";

export type UnitSystem = "original" | "metric" | "imperial";

interface AnchorOption {
  index: number;
  label: string;
  qtyText: string;
  qtyValue: number;
  unit: string;
}

@Component({
  standalone: true,
  selector: "scale-recipe",
  templateUrl: "scale-recipe.component.html",
  styleUrls: ["scale-recipe.component.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonButton,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonFooter,
  ],
})
export class ScaleRecipeComponent implements OnInit {
  private modalCtrl = inject(ModalController);
  private translate = inject(TranslateService);

  @Input() scale: string = "1";
  @Input() unitSystem: UnitSystem = "original";
  @Input() yieldText: string | null = null;
  @Input() ingredients: ParsedIngredient[] = [];

  originalServings: number | null = null;
  servingsInput: string = "";

  anchorOptions: AnchorOption[] = [];
  anchorIndex: number | null = null;
  anchorQtyInput: string = "";

  readonly presets = ["1/2", "1", "2", "3", "4"];

  ngOnInit() {
    this.originalServings = parseYieldCount(this.yieldText);
    this.refreshServingsFromScale();
    this.anchorOptions = this.buildAnchorOptions();
  }

  private targetSystem(): System | undefined {
    if (this.unitSystem === "metric") return System.METRIC;
    if (this.unitSystem === "imperial") return System.US;
    return undefined;
  }

  private buildAnchorOptions(): AnchorOption[] {
    const targetSystem = this.targetSystem();
    return this.ingredients
      .map((ingredient, index) => {
        if (ingredient.isHeader) return null;
        const sourceText =
          targetSystem !== undefined
            ? (parseIngredients(
                ingredient.originalContent,
                "1",
                targetSystem,
              )[0]?.plaintextContent ?? ingredient.originalContent)
            : ingredient.originalContent;
        const measurement = getAnchorMeasurement(sourceText);
        if (!measurement) return null;
        const name = stripIngredient(ingredient.originalContent).trim();
        if (!name) return null;
        return {
          index,
          label: name,
          qtyText: measurement.qtyText,
          qtyValue: measurement.qtyValue,
          unit: measurement.unit,
        };
      })
      .filter((option): option is AnchorOption => option !== null);
  }

  private toNumeric(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const normalized =
      this.decimalSeparator() === "," ? trimmed.replace(",", ".") : trimmed;
    try {
      const parsed = fractionjs(normalized).valueOf();
      if (!Number.isFinite(parsed) || parsed <= 0) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private decimalSeparator(): string {
    const lang = this.translate.getCurrentLang();
    return (1.1).toLocaleString(lang).charAt(1);
  }

  private setScaleFromNumber(
    value: number,
    opts: { skipServings?: boolean; skipAnchor?: boolean } = {},
  ) {
    this.scale = fractionjs(value).toFraction(true);
    if (!opts.skipServings) this.refreshServingsFromScale();
    if (!opts.skipAnchor) this.refreshAnchorQtyFromScale();
  }

  private refreshServingsFromScale() {
    if (this.originalServings === null) return;
    const scaleValue = this.toNumeric(this.scale) ?? 1;
    const scaled = this.originalServings * scaleValue;
    this.servingsInput = this.formatCount(scaled);
  }

  private refreshAnchorQtyFromScale() {
    if (this.anchorIndex === null) return;
    const ingredient = this.ingredients[this.anchorIndex];
    if (!ingredient) return;
    const scaleStr = this.scale.trim() || "1";
    const parsed = parseIngredients(
      ingredient.originalContent,
      scaleStr,
      this.targetSystem(),
    );
    const measurement = getAnchorMeasurement(parsed[0]?.plaintextContent ?? "");
    if (!measurement) return;
    this.anchorQtyInput = measurement.qtyText;
  }

  private formatCount(value: number): string {
    if (!Number.isFinite(value)) return "";
    const lang = this.translate.getCurrentLang();
    return value.toLocaleString(lang, { maximumFractionDigits: 2 });
  }

  setPresetScale(scale: string) {
    this.scale = scale;
    this.refreshServingsFromScale();
    this.refreshAnchorQtyFromScale();
  }

  onScaleInput() {
    this.refreshServingsFromScale();
    this.refreshAnchorQtyFromScale();
  }

  onUnitSystemChange() {
    this.anchorOptions = this.buildAnchorOptions();
    this.refreshAnchorQtyFromScale();
  }

  onServingsInput() {
    if (this.originalServings === null) return;
    const desired = this.toNumeric(this.servingsInput);
    if (desired === null) return;
    this.setScaleFromNumber(desired / this.originalServings, {
      skipServings: true,
    });
  }

  onAnchorIngredientChange(index: number | null) {
    this.anchorIndex = index;
    if (index === null) {
      this.anchorQtyInput = "";
      return;
    }
    this.refreshAnchorQtyFromScale();
  }

  onAnchorQtyInput() {
    const option = this.selectedAnchor();
    if (!option) return;
    const desired = this.toNumeric(this.anchorQtyInput);
    if (desired === null) return;
    this.setScaleFromNumber(desired / option.qtyValue, { skipAnchor: true });
  }

  selectedAnchor(): AnchorOption | undefined {
    if (this.anchorIndex === null) return undefined;
    return this.anchorOptions.find(
      (candidate) => candidate.index === this.anchorIndex,
    );
  }

  private sanitizedScale(): string {
    const trimmed = this.scale.trim();
    try {
      if (fractionjs(trimmed).valueOf() <= 0) return "1";
      return trimmed;
    } catch {
      return "1";
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }

  apply() {
    this.modalCtrl.dismiss({
      scale: this.sanitizedScale(),
      unitSystem: this.unitSystem,
    });
  }
}
