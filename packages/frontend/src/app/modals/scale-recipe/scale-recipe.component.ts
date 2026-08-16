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
import fractionjs from "fraction.js";
import { System } from "@recipesage/unitz-ts";
import {
  getAnchorMeasurement,
  parseIngredients,
  parseYieldCount,
  stripIngredient,
  ParsedIngredient,
  type DecimalNotation,
  applyDecimalNotation,
  localeToPlainNumber,
  formatQuantity,
} from "@recipesage/util/shared";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

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

  @Input() scale: string = "1";
  @Input() unitSystem: UnitSystem = "original";
  @Input() yieldText: string | null = null;
  @Input() ingredients: ParsedIngredient[] = [];
  @Input() decimalNotationMode: DecimalNotation = ".";

  originalServings: number | null = null;
  servingsInput: string = "";

  anchorOptions: AnchorOption[] = [];
  anchorIndex: number | null = null;
  anchorQtyInput: string = "";

  readonly presets = ["1/2", "1", "2", "3", "4"];

  ngOnInit() {
    this.scale = applyDecimalNotation(this.scale, this.decimalNotationMode);
    this.originalServings = parseYieldCount(
      this.yieldText,
      this.decimalNotationMode,
    );
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
    const decimalNotationMode = this.decimalNotationMode;
    return this.ingredients
      .map((ingredient, index) => {
        if (ingredient.isHeader) return null;
        const sourceText =
          targetSystem !== undefined
            ? (parseIngredients(ingredient.originalContent, "1", {
                targetSystem,
                decimalNotationMode,
              })[0]?.plaintextContent ?? ingredient.originalContent)
            : ingredient.originalContent;
        const measurement = getAnchorMeasurement(
          sourceText,
          decimalNotationMode,
        );
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
    try {
      const parsed = fractionjs(
        localeToPlainNumber(trimmed, this.decimalNotationMode),
      ).valueOf();
      if (!Number.isFinite(parsed) || parsed <= 0) return null;
      return parsed;
    } catch {
      return null;
    }
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
    const parsed = parseIngredients(ingredient.originalContent, scaleStr, {
      targetSystem: this.targetSystem(),
      decimalNotationMode: this.decimalNotationMode,
    });
    const measurement = getAnchorMeasurement(
      parsed[0]?.plaintextContent ?? "",
      this.decimalNotationMode,
    );
    if (!measurement) return;
    this.anchorQtyInput = measurement.qtyText;
  }

  private formatCount(value: number): string {
    return formatQuantity(value, this.decimalNotationMode, 2);
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
    const plain = localeToPlainNumber(this.scale, this.decimalNotationMode);
    try {
      if (fractionjs(plain).valueOf() <= 0) return "1";
      return plain;
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
