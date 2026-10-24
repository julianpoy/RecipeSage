import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  inject,
  ChangeDetectionStrategy,
  type AfterViewInit,
  type OnDestroy,
  type OnInit,
} from "@angular/core";
import { IonLabel, IonSegment, IonSegmentButton } from "@ionic/angular";
import {
  RecipeDetailsPreferenceKey,
  RecipeDetailsSmallScreenLayoutOptions,
} from "@recipesage/util/shared";
import { PreferencesService } from "../../services/preferences.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "ingredients-instructions-layout",
  templateUrl: "ingredients-instructions-layout.component.html",
  styleUrls: ["./ingredients-instructions-layout.component.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [...SHARED_UI_IMPORTS, IonSegment, IonSegmentButton, IonLabel],
})
export class IngredientsInstructionsLayoutComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private preferencesService = inject(PreferencesService);

  @Input() wideScreenMinWidth = 576;

  @ViewChild("layout", { static: true }) layout!: ElementRef<HTMLDivElement>;
  @ViewChild("ingredientsCol", { static: true })
  ingredientsCol!: ElementRef<HTMLDivElement>;
  @ViewChild(IonSegment, { read: ElementRef })
  tabs?: ElementRef<HTMLElement>;

  activeTab: "ingredients" | "instructions" = "ingredients";
  isWideScreen = false;

  private wideScreenQuery?: MediaQueryList;
  private scrollEl?: HTMLElement;
  private resizeObserver?: ResizeObserver;
  private destroyed = false;

  private onWideScreenChange = (event: MediaQueryListEvent) => {
    this.isWideScreen = event.matches;
  };

  get smallScreenLayout() {
    return this.preferencesService.preferences[
      RecipeDetailsPreferenceKey.SmallScreenLayout
    ];
  }

  get isTwoColumn() {
    return (
      this.isWideScreen ||
      this.smallScreenLayout ===
        RecipeDetailsSmallScreenLayoutOptions.SideBySide
    );
  }

  get showTabs() {
    return (
      !this.isWideScreen &&
      this.smallScreenLayout === RecipeDetailsSmallScreenLayoutOptions.Tabs
    );
  }

  ngOnInit() {
    this.wideScreenQuery = window.matchMedia(
      `(min-width: ${this.wideScreenMinWidth}px)`,
    );
    this.isWideScreen = this.wideScreenQuery.matches;
    this.wideScreenQuery.addEventListener("change", this.onWideScreenChange);
  }

  async ngAfterViewInit() {
    const contentEl = this.elementRef.nativeElement.closest("ion-content");
    if (!contentEl) return;

    const scrollEl = await contentEl.getScrollElement();
    if (this.destroyed) return;
    this.scrollEl = scrollEl;

    this.resizeObserver = new ResizeObserver(() => {
      this.updateStickyTop();
    });
    this.resizeObserver.observe(this.ingredientsCol.nativeElement);
    this.resizeObserver.observe(scrollEl);
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.wideScreenQuery?.removeEventListener(
      "change",
      this.onWideScreenChange,
    );
    this.resizeObserver?.disconnect();
  }

  tabChanged() {
    if (!this.scrollEl || !this.tabs) return;

    const layoutTop = this.layout.nativeElement.getBoundingClientRect().top;
    const tabsTop = this.tabs.nativeElement.getBoundingClientRect().top;
    if (layoutTop < tabsTop) {
      this.scrollEl.scrollTop += layoutTop - tabsTop;
    }
  }

  private updateStickyTop() {
    if (!this.scrollEl) return;

    const scrollStyles = getComputedStyle(this.scrollEl);
    const stickyAreaHeight =
      this.scrollEl.clientHeight -
      parseFloat(scrollStyles.paddingTop) -
      parseFloat(scrollStyles.paddingBottom);

    const ingredientsColEl = this.ingredientsCol.nativeElement;
    const overflow = Math.max(
      0,
      ingredientsColEl.offsetHeight - stickyAreaHeight,
    );
    ingredientsColEl.style.setProperty("--sticky-top", `${-overflow}px`);
  }
}
