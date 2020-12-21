import { Component, Input, Output, EventEmitter } from '@angular/core';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { LabelService } from '@/services/label.service';
import { ToastController, NavController } from '@ionic/angular';

@Component({
  selector: 'select-label',
  templateUrl: 'index.html',
  styleUrls: ['./index.scss']
})
export class SelectLabelComponent {

  searchText = '';

  _selectedLabel: any;
  @Input()
  get selectedLabel() {
    return this._selectedLabel;
  }

  set selectedLabel(val) {
    this._selectedLabel = val;
    this.selectedLabelChange.emit(this._selectedLabel);
  }

  @Output() selectedLabelChange = new EventEmitter();

  labels: any = [];
  results: any = [];

  constructor(
    public loadingService: LoadingService,
    public utilService: UtilService,
    public labelService: LabelService,
    public toastCtrl: ToastController,
    public navCtrl: NavController
  ) {
    this.load();
  }

  async load() {
    const loading = this.loadingService.start();
    const labels = await this.labelService.getMyLabels();
    if (labels) {
      this.labels = labels;
      this.results = this.labels;
    }
    loading.dismiss();
  }

  onSearchInputChange(event) {
    this.searchText = event.detail.value || "";

    this.results = this.labels.filter(label => label.title.includes(this.searchText));
  }

  selectLabel(label) {
    this.selectedLabel = label;
    this.searchText = '';
    this.results = this.labels;
  }
}
