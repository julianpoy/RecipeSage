import { Directive, ElementRef, Renderer2 } from "@angular/core";

@Directive({
  selector: "[appToggleablePassword]",
})
export class ToggleablePasswordDirective {
  private showPassword = false;
  private eyeIcon!: HTMLElement;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
  ) {
    this.setup();
  }

  setup() {
    // Create the eye icon for showing/hiding password
    this.eyeIcon = this.renderer.createElement("ion-icon");
    this.renderer.addClass(this.eyeIcon, "medium-icon");
    this.renderer.addClass(this.eyeIcon, "eye-icon");
    this.renderer.setAttribute(this.eyeIcon, "name", "eye-off-outline");
    this.renderer.listen(this.eyeIcon, "click", () => this.toggleShow());

    // Append the eye icon next to the input field
    this.renderer.appendChild(this.el.nativeElement.parentNode, this.eyeIcon);
  }

  toggleShow() {
    this.showPassword = !this.showPassword;
    const passwordInput = this.el.nativeElement;
    passwordInput.type = this.showPassword ? "text" : "password";

    const iconName = this.showPassword ? "eye-outline" : "eye-off-outline";
    this.renderer.setAttribute(this.eyeIcon, "name", iconName);
  }
}
