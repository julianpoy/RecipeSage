import { Component, Input, Output, EventEmitter } from "@angular/core";
import { LoadingService } from "~/services/loading.service";
import { UtilService } from "~/services/util.service";
import { Label, LabelService } from "~/services/label.service";
import { ToastController, NavController } from "@ionic/angular";

@Component({
  selector: "select-label",
  templateUrl: "select-label.component.html",
  styleUrls: ["./select-label.component.scss"],
})
export class SelectLabelComponent {
  searchText = "";

  _selectedLabel?: Label;
  @Input()
  get selectedLabel() {
    return this._selectedLabel;
  }

  set selectedLabel(val) {
    this._selectedLabel = val;
    this.selectedLabelChange.emit(this._selectedLabel);
  }

  @Output() selectedLabelChange = new EventEmitter();

  labels: Label[] = [];
  results: Label[] = [];

  constructor(
    public loadingService: LoadingService,
    public utilService: UtilService,
    public labelService: LabelService,
    public toastCtrl: ToastController,
    public navCtrl: NavController,
  ) {
    this.load();
  }

  async load() {
    const loading = this.loadingService.start();
    const response = await this.labelService.fetch();
    loading.dismiss();
    if (!response.success) return;

    this.labels = response.data;
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

  selectLabel(label: Label) {
    this.selectedLabel = label;
    this.searchText = "";
    this.results = this.labels;
  }

  labelTrackBy(index: number, label: Label) {
    return label.id;
  }
}
