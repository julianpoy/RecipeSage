import { Component, Input, Output, EventEmitter } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";

@Component({
  selector: "recipe-preview",
  templateUrl: "recipe-preview.component.html",
  styleUrls: ["./recipe-preview.component.scss"],
})
export class RecipePreviewComponent {
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

  constructor(public sanitizer: DomSanitizer) {}

  onClick(event: Event) {
    this.previewClick.emit(event);
  }
}
