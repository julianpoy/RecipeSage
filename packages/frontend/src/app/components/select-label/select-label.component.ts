import { Component, Input, Output, EventEmitter, inject } from "@angular/core";
import { LoadingService } from "~/services/loading.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { ServerActionsService } from "../../services/server-actions.service";
import type { LabelSummary } from "@recipesage/prisma";
import {
  IonItem,
  IonIcon,
  IonLabel,
  IonSearchbar,
} from "@ionic/angular/standalone";
import { folderOpen, pricetag } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "select-label",
  templateUrl: "select-label.component.html",
  styleUrls: ["./select-label.component.scss"],
  imports: [...SHARED_UI_IMPORTS, IonItem, IonIcon, IonLabel, IonSearchbar],
})
export class SelectLabelComponent {
  private loadingService = inject(LoadingService);
  private serverActionsService = inject(ServerActionsService);

  searchText = "";

  _selectedLabel?: LabelSummary;
  @Input()
  get selectedLabel() {
    return this._selectedLabel;
  }

  set selectedLabel(val) {
    this._selectedLabel = val;
    this.selectedLabelChange.emit(this._selectedLabel);
  }

  @Output() selectedLabelChange = new EventEmitter<LabelSummary>();

  labels: LabelSummary[] = [];
  results: LabelSummary[] = [];

  constructor() {
    addIcons({ folderOpen, pricetag });
    this.load();
  }

  async load() {
    const loading = this.loadingService.start();
    const response = await this.serverActionsService.labels.getLabels();
    loading.dismiss();
    if (!response) return;

    this.labels = response.sort((a, b) => a.title.localeCompare(b.title));
    this.results = this.labels;
  }

  onSearchInputChange(event: any) {
    this.searchText = event.detail.value || "";
    if (!this.searchText) {
      this.results = this.labels;
      return;
    }

    this.results = this.labels.filter((label) =>
      label.title.includes(this.searchText),
    );
  }

  selectLabel(label: LabelSummary) {
    this.selectedLabel = label;
    this.searchText = "";
    this.results = this.labels;
  }

  labelTrackBy(index: number, label: LabelSummary) {
    return label.id;
  }
}
