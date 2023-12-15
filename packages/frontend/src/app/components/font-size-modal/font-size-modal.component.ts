import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { PreferencesService } from "../../services/preferences.service";
import { GlobalPreferenceKey, SupportedFontSize } from "@recipesage/util";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: "font-size-modal",
  templateUrl: "font-size-modal.component.html",
  styleUrls: ["./font-size-modal.component.scss"],
})
export class FontSizeModalComponent {
  preferences = this.preferencesService.preferences;

  supportedFontSizes = SupportedFontSize as Record<string, string>;
  fontSizeOptions = [
    {
      fontSize: SupportedFontSize.X1_0,
      translationName: "components.fontSize.option.X1_0",
      displayName: "1x", // An appropriate translation should be added to pages.settings.fontSize.option.X
    },
    {
      fontSize: SupportedFontSize.PX14,
      translationName: "components.fontSize.option.PX14",
      displayName: "14px", // These are overridden by loadFontSizeOptions, but exist in case translations cannot be loaded
    },
    {
      fontSize: SupportedFontSize.PX16,
      translationName: "components.fontSize.option.PX16",
      displayName: "16px",
    },
    {
      fontSize: SupportedFontSize.PX18,
      translationName: "components.fontSize.option.PX18",
      displayName: "18px",
    },
    {
      fontSize: SupportedFontSize.PX20,
      translationName: "components.fontSize.option.PX20",
      displayName: "20px",
    },
    {
      fontSize: SupportedFontSize.PX22,
      translationName: "components.fontSize.option.PX22",
      displayName: "22px",
    },
    {
      fontSize: SupportedFontSize.PX24,
      translationName: "components.fontSize.option.PX24",
      displayName: "24px",
    },
  ];

  _fontSize: SupportedFontSize = this.preferences[GlobalPreferenceKey.FontSize];
  @Input()
  set fontSize(fontSize: SupportedFontSize) {
    this._fontSize = fontSize;
  }
  get fontSize() {
    return this._fontSize;
  }

  constructor(
    private modalCtrl: ModalController,
    private preferencesService: PreferencesService,
    private translate: TranslateService,
  ) {
    this.loadFontSizeOptions();
  }

  async loadFontSizeOptions() {
    for (const fontSizeOption of this.fontSizeOptions) {
      const title = await this.translate
        .get(fontSizeOption.translationName)
        .toPromise();
      fontSizeOption.displayName = title;
    }
  }

  onFontSizeChanged(event: any) {
    this.fontSize = event.detail.value;
  }

  reset() {
    this.fontSize = SupportedFontSize.X1_0;

    this.close();
  }

  close() {
    this.modalCtrl.dismiss({
      fontSize: this.fontSize,
    });
  }
}
