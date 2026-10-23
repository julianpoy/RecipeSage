import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { IonIcon, IonItem, IonInput } from "@ionic/angular/standalone";
import { banOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

const PRESET_COLORS = [
  "#eb445a",
  "#ff7f50",
  "#ffc409",
  "#2dd36f",
  "#3dc2ff",
  "#6a64ff",
  "#e040fb",
  "#795548",
  "#92949c",
  "#222428",
];

const HEX_COLOR_RE = /^[0-9a-fA-F]{6}$/;

@Component({
  standalone: true,
  selector: "color-picker",
  templateUrl: "color-picker.component.html",
  styleUrls: ["./color-picker.component.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [...SHARED_UI_IMPORTS, IonIcon, IonItem, IonInput],
})
export class ColorPickerComponent {
  constructor() {
    addIcons({ banOutline });
  }

  @Input() color: string | null = null;
  @Output() colorChange = new EventEmitter<string | null>();
  @Output() presetSelected = new EventEmitter<string | null>();

  readonly presetColors = PRESET_COLORS;
  customHexValue = "";

  selectColor(color: string | null) {
    this.color = color;
    this.customHexValue = "";
    this.colorChange.emit(this.color);
    this.presetSelected.emit(this.color);
  }

  onCustomHexInput() {
    const hex = this.customHexValue.replace("#", "").trim();
    if (HEX_COLOR_RE.test(hex)) {
      this.color = `#${hex.toLowerCase()}`;
      this.colorChange.emit(this.color);
    }
  }
}
