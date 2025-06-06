import { Component, Input, Output, EventEmitter } from "@angular/core";

@Component({
  selector: "collapsible-category",
  templateUrl: "./collapsible-category.component.html",
})
export class CollapsibleCategoryComponent {
  @Input() categoryTitle: string = "";
  @Input() isCollapsed: boolean = false;
  @Input() editMode: boolean = false;
  @Input() items: any[] = [];
  @Input() preferences: any = {};
  @Input() preferenceKeys: any = {};
  @Input() list: any = null;

  @Output() toggleCollapse = new EventEmitter<string>();

  onToggleCollapse() {
    this.toggleCollapse.emit(this.categoryTitle);
  }
}
