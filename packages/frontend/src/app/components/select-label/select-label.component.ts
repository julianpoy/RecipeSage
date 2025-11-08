import { Component, Input, Output, EventEmitter, inject } from "@angular/core";
import { LoadingService } from "~/services/loading.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { TRPCService } from "../../services/trpc.service";
import { LabelSummary } from "@recipesage/prisma";

@Component({
  selector: "select-label",
  templateUrl: "select-label.component.html",
  styleUrls: ["./select-label.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class SelectLabelComponent {
  private loadingService = inject(LoadingService);
  private trpcService = inject(TRPCService);

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
    this.load();
  }

  async load() {
    const loading = this.loadingService.start();
    const response = await this.trpcService.handle(
      this.trpcService.trpc.labels.getLabels.query(),
    );
    loading.dismiss();
    if (!response) return;

    this.labels = response;
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
