import { Component, Input, inject } from "@angular/core";
import {
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
} from "@ionic/angular/standalone";
import { closeOutline, checkmarkOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

@Component({
  standalone: true,
  selector: "searchable-select-modal",
  templateUrl: "searchable-select-modal.component.html",
  styleUrls: ["./searchable-select-modal.component.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
  ],
})
export class SearchableSelectModalComponent {
  private modalCtrl = inject(ModalController);

  @Input() title = "";
  @Input() options: SearchableSelectOption[] = [];
  @Input() searchPlaceholder?: string;
  @Input() noResultsText?: string;
  @Input() selectedValue?: string;

  searchText = "";

  constructor() {
    addIcons({ closeOutline, checkmarkOutline });
  }

  get filteredOptions(): SearchableSelectOption[] {
    const query = this.searchText.trim().toLowerCase();
    if (!query) return this.options;
    return this.options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        (option.sublabel?.toLowerCase().includes(query) ?? false),
    );
  }

  select(option: SearchableSelectOption) {
    this.modalCtrl.dismiss(option);
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
