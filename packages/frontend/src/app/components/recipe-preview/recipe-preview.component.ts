import { Component, Input, Output, EventEmitter, inject } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "recipe-preview",
  templateUrl: "recipe-preview.component.html",
  styleUrls: ["./recipe-preview.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class RecipePreviewComponent {
  sanitizer = inject(DomSanitizer);

  @Input() selected: boolean = false;
  @Input() landscape: boolean = false;

  trustedPreviewSrc: SafeResourceUrl =
    this.sanitizer.bypassSecurityTrustResourceUrl("");
  @Input()
  set url(url: string) {
    this.trustedPreviewSrc = this.sanitizer.bypassSecurityTrustResourceUrl(
      url || "",
    );
  }

  @Input({
    required: true,
  })
  description!: string;

  @Output() previewClick = new EventEmitter();

  onClick(event: Event) {
    this.previewClick.emit(event);
  }
}
