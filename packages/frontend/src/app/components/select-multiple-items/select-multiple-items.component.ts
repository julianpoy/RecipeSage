import { Component, Input, Output, EventEmitter } from "@angular/core";
import { LoadingService } from "~/services/loading.service";
import { UtilService } from "~/services/util.service";
import { Label, LabelService } from "~/services/label.service";
import { ToastController, NavController } from "@ionic/angular";

export interface SelectableItem {
  id: string;
  title: string;
  image?: string;
  icon?: string;
}

@Component({
  selector: "select-multiple-items",
  templateUrl: "select-multiple-items.component.html",
  styleUrls: ["./select-multiple-items.component.scss"],
})
export class SelectMultipleItemsComponent<T extends SelectableItem> {
  searchText = "";

  @Input() enableCreateNew = false;
  @Input() noItemsText?: string;
  @Input() searchPlaceholderText?: string;

  @Input({
    required: true,
  })
  items!: T[];

  @Input({
    required: false,
  })
  disallowedTitles: { [title: string]: string } = {}; // Keys are label titles, values are lang keys

  _selectedItems: T[] = [];
  @Input()
  get selectedItems() {
    return this._selectedItems;
  }

  set selectedItems(val) {
    this._selectedItems = val;
    this.selectedItemsChange.emit(this._selectedItems);
  }

  @Output() selectedItemsChange = new EventEmitter<T[]>();
  @Output() newItem = new EventEmitter<string>();

  searchResults: T[] = [];
  exactItemMatch?: T;

  searchFocused = false;
  searchFocusTimeout: NodeJS.Timeout | null = null;

  constructor(
    public loadingService: LoadingService,
    public utilService: UtilService,
    public labelService: LabelService,
    public toastCtrl: ToastController,
    public navCtrl: NavController,
  ) {}

  populateInitialResults() {
    this.searchResults = this.getUnselectedItems();
  }

  onSearchInputChange(event: any) {
    this.searchText = event.detail.value || "";
    this.updateResults();
  }

  onSearchFocus() {
    if (this.searchFocusTimeout) {
      clearTimeout(this.searchFocusTimeout);
    }

    this.updateResults();

    this.searchFocused = true;
  }

  onSearchBlur() {
    if (this.searchFocusTimeout) {
      clearTimeout(this.searchFocusTimeout);
    }
    // Timeout is needed since we don't currently have a way of knowing if user clicked an item or clicked out completely. Clicking an item takes time to fire
    this.searchFocusTimeout = setTimeout(() => {
      this.searchFocused = false;
    }, 500);
  }

  getUnselectedItems() {
    const selectedItemIds = new Set(
      this.selectedItems.map((selectedItem) => selectedItem.id),
    );
    const unselectedItems = this.items.filter(
      (item) => !selectedItemIds.has(item.id),
    );

    return unselectedItems;
  }

  isSelected(item: T) {
    return this.selectedItems.some(
      (selectedItem) => selectedItem.id === item.id,
    );
  }

  isMatch(item: T) {
    return item.title
      .toLowerCase()
      .includes(this.searchText.toLowerCase() || "");
  }

  isExactMatch(item: T) {
    return item.title.toLowerCase() === this.searchText.toLowerCase();
  }

  updateResults() {
    this.searchResults = [];
    this.exactItemMatch = undefined;

    if (!this.searchText.length) {
      this.populateInitialResults();
      return;
    }

    this.searchResults = this.getUnselectedItems().filter((item) =>
      this.isMatch(item),
    );

    this.exactItemMatch = this.items.find((item) => this.isExactMatch(item));
  }

  resetSearch() {
    this.searchText = "";
    this.searchResults = [];
    this.exactItemMatch = undefined;
    this.searchFocused = false;
  }

  selectItem(item: T) {
    this.selectedItems = [...this.selectedItems, item];
    this.resetSearch();
  }

  deselectItem(item: T) {
    const selectedItems = Array.from(this.selectedItems);
    const idx = selectedItems.findIndex(
      (selectedItem) => selectedItem.id === item.id,
    );
    selectedItems.splice(idx, 1);

    this.selectedItems = selectedItems;
  }

  create() {
    this.newItem.emit(this.searchText);
    this.resetSearch();
  }

  itemTrackBy(_: number, item: T) {
    return item.id;
  }
}
