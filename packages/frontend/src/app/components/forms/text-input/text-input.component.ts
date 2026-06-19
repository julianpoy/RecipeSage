import { Component, Input, forwardRef } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";

let nextId = 0;

@Component({
  standalone: true,
  selector: "text-input",
  templateUrl: "text-input.component.html",
  styleUrls: ["text-input.component.scss"],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextInputComponent),
      multi: true,
    },
  ],
})
export class TextInputComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() placeholder?: string;
  @Input() helperText?: string;
  @Input() errorText?: string;
  @Input() invalid = false;
  @Input() disabled = false;
  @Input() name?: string;
  @Input() type = "text";
  @Input() inputmode?: string;
  @Input() maxlength?: number;
  @Input() autocapitalize = "off";
  @Input() autocorrect = "off";
  @Input() spellcheck = true;

  readonly inputId = `rs-text-input-${nextId++}`;

  value = "";

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null) {
    this.value = value ?? "";
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
  }

  onBlur() {
    this.onTouched();
  }
}
