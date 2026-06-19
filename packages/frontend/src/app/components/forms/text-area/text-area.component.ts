import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
  forwardRef,
} from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";

let nextId = 0;

@Component({
  standalone: true,
  selector: "text-area",
  templateUrl: "text-area.component.html",
  styleUrls: ["text-area.component.scss"],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextAreaComponent),
      multi: true,
    },
  ],
})
export class TextAreaComponent implements ControlValueAccessor, AfterViewInit {
  @Input() label?: string;
  @Input() ariaLabel?: string;
  @Input() placeholder?: string;
  @Input() helperText?: string;
  @Input() errorText?: string;
  @Input() invalid = false;
  @Input() disabled = false;
  @Input() name?: string;
  @Input() rows = 4;
  @Input() autoGrow = false;
  @Input() maxlength?: number;
  @Input() autocapitalize = "off";
  @Input() autocorrect = "off";
  @Input() spellcheck = true;

  @ViewChild("control") private controlRef?: ElementRef<HTMLTextAreaElement>;

  readonly inputId = `rs-text-area-${nextId++}`;

  value = "";

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit() {
    this.scheduleResize();
  }

  getControlElement(): HTMLTextAreaElement | undefined {
    return this.controlRef?.nativeElement;
  }

  writeValue(value: string | null) {
    this.value = value ?? "";
    this.scheduleResize();
  }

  registerOnChange(fn: (value: string) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
  }

  onInput(value: string) {
    this.value = value;
    this.onChange(value);
    this.resize();
  }

  onBlur() {
    this.onTouched();
  }

  private scheduleResize() {
    requestAnimationFrame(() => this.resize());
  }

  private resize() {
    if (!this.autoGrow || !this.controlRef) return;
    const el = this.controlRef.nativeElement;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }
}
